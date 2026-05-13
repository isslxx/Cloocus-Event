import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import { formatKST } from '@/lib/date';
import * as XLSX from 'xlsx';

type RegRow = {
  id: string;
  event_id: string | null;
  name: string;
  company_name: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  industry: string;
  company_size: string;
  referral_source: string;
  referrer_name: string;
  inquiry: string;
  cancelled_at: string | null;
  privacy_consent: boolean;
  created_at: string;
};

const NO_EVENT_LABEL = '(이벤트 미지정)';

// Excel 시트명 제약: 31자, : \ / ? * [ ] 금지
function sanitizeSheetName(name: string, used: Set<string>): string {
  const cleaned = (name || NO_EVENT_LABEL).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || NO_EVENT_LABEL;
  let candidate = cleaned;
  let n = 2;
  while (used.has(candidate)) {
    const suffix = ` (${n})`;
    candidate = cleaned.slice(0, 31 - suffix.length) + suffix;
    n++;
  }
  used.add(candidate);
  return candidate;
}

function rowFromReg(r: RegRow, i: number, eventName: string) {
  return {
    'No.': i + 1,
    '이벤트명': eventName,
    '성함': r.name,
    '회사명': r.company_name,
    '부서명': r.department,
    '직급': r.job_title,
    '이메일': r.email,
    '연락처': r.phone,
    '산업군': r.industry,
    '기업 규모': r.company_size,
    '신청 경로': r.referral_source,
    '추천인': r.referrer_name || '',
    '문의사항': r.inquiry || '',
    '취소여부': r.cancelled_at ? `취소 (${formatKST(r.cancelled_at, { withSeconds: true })})` : '',
    '개인정보 동의': r.privacy_consent ? 'Y' : 'N',
    '등록일시 (KST)': formatKST(r.created_at, { withSeconds: true }),
  };
}

const COL_WIDTHS = [
  { wch: 5 },  // No.
  { wch: 28 }, // 이벤트명
  { wch: 10 }, // 성함
  { wch: 20 }, // 회사명
  { wch: 12 }, // 부서명
  { wch: 10 }, // 직급
  { wch: 25 }, // 이메일
  { wch: 15 }, // 연락처
  { wch: 15 }, // 산업군
  { wch: 12 }, // 기업 규모
  { wch: 18 }, // 신청 경로
  { wch: 10 }, // 추천인
  { wch: 30 }, // 문의사항
  { wch: 22 }, // 취소여부
  { wch: 10 }, // 개인정보 동의
  { wch: 20 }, // 등록일
];

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const format = req.nextUrl.searchParams.get('format') || 'csv';
  const ids = req.nextUrl.searchParams.get('ids');

  let query = supabase
    .from('event_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    query = query.in('id', idList);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const registrations = (data || []) as RegRow[];

  // 이벤트명 매핑 (한 번에 모두 조회)
  const eventIds = Array.from(new Set(registrations.map((r) => r.event_id).filter((id): id is string => !!id)));
  let eventMap = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: evts } = await supabase.from('events').select('id, name').in('id', eventIds);
    eventMap = new Map(((evts || []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  }

  const date = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();

    // 1. "전체" 시트 — 모든 행을 이벤트명 컬럼과 함께 한 시트로
    const allRows = registrations.map((r, i) =>
      rowFromReg(r, i, r.event_id ? (eventMap.get(r.event_id) || NO_EVENT_LABEL) : NO_EVENT_LABEL)
    );
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    wsAll['!cols'] = COL_WIDTHS;
    XLSX.utils.book_append_sheet(wb, wsAll, '전체');

    // 2. 이벤트가 2개 이상이면 이벤트별 시트 추가
    const grouped = new Map<string, RegRow[]>();
    for (const r of registrations) {
      const key = r.event_id || '__none__';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }
    if (grouped.size > 1) {
      const usedSheetNames = new Set<string>(['전체']);
      // 행 수 많은 이벤트부터 정렬
      const groupsSorted = Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);
      for (const [eid, rows] of groupsSorted) {
        const evtName = eid === '__none__' ? NO_EVENT_LABEL : (eventMap.get(eid) || NO_EVENT_LABEL);
        const sheetData = rows.map((r, i) => rowFromReg(r, i, evtName));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        ws['!cols'] = COL_WIDTHS;
        const sheetName = sanitizeSheetName(evtName, usedSheetNames);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cloocus_event_${date}.xlsx"`,
      },
    });
  }

  // CSV — 단일 파일이라 시트 분리는 불가, 이벤트명 컬럼만 포함
  const rows = registrations.map((r, i) =>
    rowFromReg(r, i, r.event_id ? (eventMap.get(r.event_id) || NO_EVENT_LABEL) : NO_EVENT_LABEL)
  );
  const headers = Object.keys(rows[0] || {});
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String((row as Record<string, string | number>)[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  const csv = '﻿' + csvLines.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cloocus_event_${date}.csv"`,
    },
  });
}
