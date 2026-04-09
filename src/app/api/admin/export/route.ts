import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const format = req.nextUrl.searchParams.get('format') || 'csv';

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []).map((r, i) => ({
    'No.': i + 1,
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
    '개인정보 동의': r.privacy_consent ? 'Y' : 'N',
    '등록일': new Date(r.created_at).toLocaleString('ko-KR'),
  }));

  const date = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
      { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '등록 목록');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cloocus_event_${date}.xlsx"`,
      },
    });
  }

  // CSV (BOM for Korean in Excel)
  const headers = Object.keys(rows[0] || {});
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String(row[h as keyof typeof row] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  const csv = '\uFEFF' + csvLines.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cloocus_event_${date}.csv"`,
    },
  });
}
