import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import * as XLSX from 'xlsx';

// 프로모션 카테고리 등록자 추출
// - 기본 필드 + 이벤트별 커스텀 문항 응답까지 모두 동적 컬럼으로 풀어서 내보냄
// - 같은 라벨의 문항은 같은 컬럼으로 병합 (이벤트가 달라도 동일 질문이면 한 컬럼)
// - 신청자가 답하지 않은 컬럼은 빈 셀

type QuestionRow = {
  id: string;
  event_id: string;
  question_type: string;
  label: string;
  sort_order: number;
};

type RegistrationRow = {
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
  registration_status: string | null;
  email_status: string | null;
  cancelled_at: string | null;
  privacy_consent: boolean;
  created_at: string;
  custom_answers: Record<string, unknown> | null;
};

function answerToText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(', ');
  if (typeof v === 'boolean') return v ? '동의' : '미동의';
  if (typeof v === 'string') return v;
  return String(v);
}

const CATEGORY = '프로모션';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const format = req.nextUrl.searchParams.get('format') || 'xlsx';
  const eventIdFilter = req.nextUrl.searchParams.get('event_id') || '';
  const ids = req.nextUrl.searchParams.get('ids');

  // 1. 프로모션 카테고리 이벤트 ID + 이름 매핑
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('category', CATEGORY);
  const eventList = (events || []) as { id: string; name: string }[];
  const eventMap = new Map(eventList.map((e) => [e.id, e.name]));
  const eventIdSet = new Set(eventList.map((e) => e.id));

  if (eventIdSet.size === 0) {
    return NextResponse.json({ error: '프로모션 이벤트가 없습니다.' }, { status: 404 });
  }

  // 2. 등록 데이터
  let regQuery = supabase
    .from('event_registrations')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    regQuery = regQuery.in('id', idList);
  } else if (eventIdFilter) {
    if (!eventIdSet.has(eventIdFilter)) {
      return NextResponse.json({ error: '프로모션 이벤트가 아닙니다.' }, { status: 400 });
    }
    regQuery = regQuery.eq('event_id', eventIdFilter);
  } else {
    regQuery = regQuery.in('event_id', Array.from(eventIdSet));
  }

  const { data: regs, error } = await regQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const registrations = (regs || []) as RegistrationRow[];

  // 3. 해당 이벤트들의 커스텀 문항 정의 (라벨로 컬럼 통합)
  const targetEventIds = Array.from(new Set(registrations.map((r) => r.event_id).filter((id): id is string => !!id)));
  const { data: questionsData } = targetEventIds.length > 0
    ? await supabase
        .from('event_custom_questions')
        .select('id, event_id, question_type, label, sort_order')
        .in('event_id', targetEventIds)
        .order('sort_order', { ascending: true })
    : { data: [] };
  const questions = (questionsData || []) as QuestionRow[];

  // (event_id, question_id) → label 매핑 — 응답을 풀 때 사용
  const qIdToLabel = new Map<string, string>();
  for (const q of questions) qIdToLabel.set(q.id, q.label);

  // 라벨별 컬럼 (이벤트가 달라도 같은 라벨이면 같은 컬럼). 정렬은 등장 순서 유지.
  const customLabels: string[] = [];
  const seenLabels = new Set<string>();
  for (const q of questions) {
    if (!seenLabels.has(q.label)) {
      seenLabels.add(q.label);
      customLabels.push(q.label);
    }
  }

  // 4. 행 빌드
  const rows = registrations.map((r, i) => {
    const baseRow: Record<string, string | number> = {
      'No.': i + 1,
      '프로모션': r.event_id ? (eventMap.get(r.event_id) || '') : '',
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
      '등록 상태': r.registration_status === 'confirmed' ? '확정' : r.registration_status === 'rejected' ? '불가' : '대기',
      '이메일 발송': r.email_status === 'confirmed' ? '확정 발송' : r.email_status === 'rejected' ? '불가 발송' : '미발송',
      '취소여부': r.cancelled_at ? `취소 (${new Date(r.cancelled_at).toLocaleString('ko-KR')})` : '',
      '개인정보 동의': r.privacy_consent ? 'Y' : 'N',
      '등록일': new Date(r.created_at).toLocaleString('ko-KR'),
    };

    // 커스텀 문항 응답을 라벨 컬럼으로 풀어 채움
    const ans = (r.custom_answers && typeof r.custom_answers === 'object') ? r.custom_answers : {};
    for (const label of customLabels) baseRow[label] = '';
    for (const [qid, value] of Object.entries(ans)) {
      const label = qIdToLabel.get(qid);
      if (label) baseRow[label] = answerToText(value);
    }

    return baseRow;
  });

  const date = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비 (기본 18, 라벨 컬럼은 25)
    const baseHeaders = [
      'No.', '프로모션', '성함', '회사명', '부서명', '직급',
      '이메일', '연락처', '산업군', '기업 규모', '신청 경로', '추천인',
      '문의사항', '등록 상태', '이메일 발송', '취소여부', '개인정보 동의', '등록일',
    ];
    ws['!cols'] = [
      ...baseHeaders.map((h) => ({ wch: h === '문의사항' ? 30 : h === '이메일' ? 25 : h === '프로모션' ? 24 : h === '취소여부' ? 22 : 14 })),
      ...customLabels.map(() => ({ wch: 25 })),
    ];

    XLSX.utils.book_append_sheet(wb, ws, '프로모션 등록');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cloocus_promotions_${date}.xlsx"`,
      },
    });
  }

  // CSV
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
      'Content-Disposition': `attachment; filename="cloocus_promotions_${date}.csv"`,
    },
  });
}
