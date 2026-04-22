import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import { toChartLabel } from '@/lib/industry-groups';

type Row = {
  created_at: string;
  industry: string | null;
  referral_source: string | null;
  referrer_name: string | null;
  event_id: string | null;
  survey_completed: boolean | null;
  certificate_issued: boolean | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type CountEntry = { name: string; value: number };

function toKSTDateStr(iso: string): string {
  // created_at은 UTC. KST(+9) 기준 YYYY-MM-DD로 변환
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function offsetKSTDate(days: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + days);
  return kst.toISOString().slice(0, 10);
}

function sortTopN<T extends { value: number }>(arr: T[], n = 10): T[] {
  return [...arr].sort((a, b) => b.value - a.value).slice(0, n);
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const filter = req.nextUrl.searchParams.get('filter') || 'all';
  const rangeParam = req.nextUrl.searchParams.get('range') || '30'; // 7 | 14 | 30 | all | custom
  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');

  // 이벤트 필터 → event_id 목록 확정
  let eventIdFilter: string[] | null = null;
  if (filter === 'online' || filter === 'offline') {
    const { data: filteredEvents } = await supabase
      .from('events')
      .select('id')
      .eq('event_type', filter);
    eventIdFilter = (filteredEvents || []).map((e) => e.id);
    if (eventIdFilter.length === 0) {
      return NextResponse.json(emptyResponse());
    }
  } else if (filter !== 'all') {
    eventIdFilter = [filter];
  }

  // 기본 쿼리 — soft-delete 제외
  let query = supabase
    .from('event_registrations')
    .select('created_at, industry, referral_source, referrer_name, event_id, survey_completed, certificate_issued, utm_source, utm_medium, utm_campaign')
    .is('deleted_at', null);

  if (eventIdFilter) query = query.in('event_id', eventIdFilter);

  const [{ data: records }, { data: events }] = await Promise.all([
    query,
    supabase.from('events').select('id, name').order('event_date', { ascending: false }),
  ]);

  if (!records) return NextResponse.json(emptyResponse());

  const eventMap = new Map((events || []).map((e) => [e.id, e.name as string]));
  const today = todayKST();
  const yesterday = offsetKSTDate(-1);

  // 기간 필터 경계 (일별 차트 & 일부 KPI에만 적용, 전체 total은 전 기간)
  const rangeDays = rangeParam === '7' || rangeParam === '14' || rangeParam === '30'
    ? parseInt(rangeParam, 10) : null;
  const rangeStart = rangeDays ? offsetKSTDate(-(rangeDays - 1)) : (startParam || null);
  const rangeEnd = rangeDays ? today : (endParam || null);

  // 집계 버킷
  let todayCount = 0;
  let yesterdayCount = 0;
  let totalSurveyCompleted = 0;
  let totalCertificateIssued = 0;

  const dayMap: Record<string, number> = {};
  const indDetailMap: Record<string, { chartLabel: string; value: number }> = {};
  const indChartMap: Record<string, number> = {};
  const srcMap: Record<string, number> = {};
  const evtAgg: Record<string, { total: number; surveyCompleted: number; certificateIssued: number }> = {};
  const referrerMap: Record<string, number> = {};
  const utmSourceMap: Record<string, number> = {};
  const utmMediumMap: Record<string, number> = {};
  const utmCampaignMap: Record<string, number> = {};

  for (const rRaw of records as Row[]) {
    const r = rRaw;
    const dateKST = toKSTDateStr(r.created_at);

    if (dateKST === today) todayCount++;
    if (dateKST === yesterday) yesterdayCount++;

    // 일별 — 선택된 기간 내부만 집계
    if (!rangeStart || !rangeEnd || (dateKST >= rangeStart && dateKST <= rangeEnd)) {
      dayMap[dateKST] = (dayMap[dateKST] || 0) + 1;
    }

    // 산업군 — 상세(원본) + 차트용(괄호 제거)
    const industry = r.industry || '미지정';
    const chartLabel = toChartLabel(r.industry);
    if (!indDetailMap[industry]) indDetailMap[industry] = { chartLabel, value: 0 };
    indDetailMap[industry].value++;
    indChartMap[chartLabel] = (indChartMap[chartLabel] || 0) + 1;

    // 신청 경로
    const src = r.referral_source || '미지정';
    srcMap[src] = (srcMap[src] || 0) + 1;

    // 이벤트별 — 품질 지표 포함
    const evtKey = r.event_id ? (eventMap.get(r.event_id) || '기타') : '미지정';
    if (!evtAgg[evtKey]) evtAgg[evtKey] = { total: 0, surveyCompleted: 0, certificateIssued: 0 };
    evtAgg[evtKey].total++;
    if (r.survey_completed) evtAgg[evtKey].surveyCompleted++;
    if (r.certificate_issued) evtAgg[evtKey].certificateIssued++;

    // 퍼널 카운터
    if (r.survey_completed) totalSurveyCompleted++;
    if (r.certificate_issued) totalCertificateIssued++;

    // 추천인 — 이름이 있는 경우만
    if (r.referrer_name && r.referrer_name.trim()) {
      const key = r.referrer_name.trim();
      referrerMap[key] = (referrerMap[key] || 0) + 1;
    }

    // UTM
    if (r.utm_source) utmSourceMap[r.utm_source] = (utmSourceMap[r.utm_source] || 0) + 1;
    if (r.utm_medium) utmMediumMap[r.utm_medium] = (utmMediumMap[r.utm_medium] || 0) + 1;
    if (r.utm_campaign) utmCampaignMap[r.utm_campaign] = (utmCampaignMap[r.utm_campaign] || 0) + 1;
  }

  // 일별 — 선택 기간 내 날짜는 0건도 포함(연속 추이)
  const byDay: { date: string; count: number }[] = [];
  if (rangeStart && rangeEnd) {
    const start = new Date(rangeStart + 'T00:00:00Z');
    const end = new Date(rangeEnd + 'T00:00:00Z');
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const key = new Date(t).toISOString().slice(0, 10);
      byDay.push({ date: key.slice(5), count: dayMap[key] || 0 });
    }
  } else {
    Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => byDay.push({ date: date.slice(5), count }));
  }

  // 산업군 차트 — 모든 값 포함, 등록수 내림차순
  const byIndustryChart: CountEntry[] = Object.entries(indChartMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 산업군 상세 — 원본 값 그대로 + 차트 라벨 태그
  const byIndustryDetail = Object.entries(indDetailMap)
    .map(([industry, v]) => ({ industry, chartLabel: v.chartLabel, value: v.value }))
    .sort((a, b) => b.value - a.value);

  const bySource: CountEntry[] = Object.entries(srcMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byEvent = Object.entries(evtAgg)
    .map(([name, v]) => ({
      name,
      total: v.total,
      surveyCompleted: v.surveyCompleted,
      certificateIssued: v.certificateIssued,
      surveyRate: v.total > 0 ? v.surveyCompleted / v.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topReferrers = sortTopN(
    Object.entries(referrerMap).map(([name, value]) => ({ name, value })),
    10
  );

  const byUtmSource   = sortTopN(Object.entries(utmSourceMap).map(([name, value]) => ({ name, value })), 10);
  const byUtmMedium   = sortTopN(Object.entries(utmMediumMap).map(([name, value]) => ({ name, value })), 10);
  const byUtmCampaign = sortTopN(Object.entries(utmCampaignMap).map(([name, value]) => ({ name, value })), 10);

  const total = records.length;
  const todayDeltaPct = yesterdayCount > 0
    ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
    : todayCount > 0 ? 100 : 0;

  const surveyCompletionRate = total > 0 ? totalSurveyCompleted / total : 0;
  const certificateRate = total > 0 ? totalCertificateIssued / total : 0;

  const topReferrer = topReferrers[0] || { name: '-', value: 0 };
  const topIndustryChart = byIndustryChart[0]?.name || '-';
  const topSource = bySource[0]?.name || '-';

  // 이전 대시보드와의 호환을 위한 레거시 필드 (Export용)
  const byIndustry = byIndustryChart;

  return NextResponse.json({
    filter,
    range: { start: rangeStart, end: rangeEnd, days: rangeDays },

    // KPI (P0 확장)
    kpi: {
      total,
      today: todayCount,
      yesterdayCount,
      todayDeltaPct,
      topIndustryGroup: topIndustryChart,
      topSource,
      topReferrer,
      surveyCompletionRate,
      certificateRate,
    },

    // 퍼널 — DB 플래그 기반 3단계 (GA4 form_start는 P1)
    funnel: {
      registered: total,
      surveyCompleted: totalSurveyCompleted,
      certificateIssued: totalCertificateIssued,
    },

    byDay,
    byIndustryGroup: byIndustryChart,
    byIndustryDetail,
    bySource,
    byEvent,
    topReferrers,
    byUtm: {
      bySource: byUtmSource,
      byMedium: byUtmMedium,
      byCampaign: byUtmCampaign,
    },

    // 레거시 호환 (메트릭 카드·Export)
    total,
    today: todayCount,
    topIndustry: topIndustryChart,
    byIndustry,
  });
}

function emptyResponse() {
  return {
    filter: 'all',
    range: { start: null, end: null, days: null },
    kpi: {
      total: 0, today: 0, yesterdayCount: 0, todayDeltaPct: 0,
      topIndustryGroup: '-', topSource: '-',
      topReferrer: { name: '-', value: 0 },
      surveyCompletionRate: 0, certificateRate: 0,
    },
    funnel: { registered: 0, surveyCompleted: 0, certificateIssued: 0 },
    byDay: [], byIndustryGroup: [], byIndustryDetail: [],
    bySource: [], byEvent: [], topReferrers: [],
    byUtm: { bySource: [], byMedium: [], byCampaign: [] },
    total: 0, today: 0, topIndustry: '-', byIndustry: [],
  };
}
