'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAdmin } from './layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import type { Event } from '@/lib/types';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d', '#c026d3', '#ea580c', '#0369a1', '#4f46e5', '#84cc16'];

type UtmBreakdown = {
  bySource: { name: string; value: number }[];
  byMedium: { name: string; value: number }[];
  byCampaign: { name: string; value: number }[];
};

type DashData = {
  filter: string;
  range: { start: string | null; end: string | null; days: number | null };
  compareMode: 'off' | 'prev' | 'event';
  compareLabel: string | null;
  kpi: {
    total: number;
    today: number;
    yesterdayCount: number;
    todayDeltaPct: number;
    topIndustryGroup: string;
    topSource: string;
    topReferrer: { name: string; value: number };
    surveyCompletionRate: number;
    certificateRate: number;
    windowTotal: number;
  };
  funnel: { registered: number; surveyCompleted: number; certificateIssued: number };
  byDay: { date: string; count: number }[];
  byIndustryGroup: { name: string; value: number }[];
  byIndustryDetail: { industry: string; chartLabel: string; value: number }[];
  bySource: { name: string; value: number }[];
  byEvent: { name: string; total: number; surveyCompleted: number; certificateIssued: number; surveyRate: number }[];
  topReferrers: { name: string; value: number }[];
  byUtm: UtmBreakdown;
  visitUtm: {
    totalVisits: number;
    uniqueSessions: number;
    bySource: { name: string; value: number }[];
    byMedium: { name: string; value: number }[];
    byCampaign: { name: string; value: number }[];
  };
  compare: null | {
    mode: 'prev' | 'event';
    label: string;
    range: { start: string | null; end: string | null };
    windowTotal: number;
    funnel: { registered: number; surveyCompleted: number; certificateIssued: number };
    byDay: { date: string; count: number }[];
    byIndustryGroup: { name: string; value: number }[];
    bySource: { name: string; value: number }[];
    byUtm: UtmBreakdown;
    surveyCompletionRate: number;
  };
  // 레거시
  total: number;
  today: number;
  topIndustry: string;
  byIndustry: { name: string; value: number }[];
};

type RangePreset = '7' | '14' | '30' | 'custom' | 'all';
type CompareMode = 'off' | 'prev' | 'event';

export default function AdminDashboard() {
  const { accessToken } = useAdmin();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'pptx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [range, setRange] = useState<RangePreset>('30');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [industryGroupFilter, setIndustryGroupFilter] = useState<string>('all');
  const [utmTab, setUtmTab] = useState<'source' | 'medium' | 'campaign'>('source');
  const [visitUtmTab, setVisitUtmTab] = useState<'source' | 'medium' | 'campaign'>('source');
  const [compareMode, setCompareMode] = useState<CompareMode>('off');
  const [compareEventId, setCompareEventId] = useState<string>('');
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const buildQuery = useCallback((f: string, r: RangePreset, cmp: CompareMode, cmpEvt: string) => {
    const params = new URLSearchParams();
    params.set('filter', f);
    if (r === 'custom') {
      params.set('range', 'custom');
      if (customStart) params.set('start', customStart);
      if (customEnd) params.set('end', customEnd);
    } else {
      params.set('range', r);
    }
    if (cmp !== 'off') {
      params.set('compare', cmp);
      if (cmp === 'event' && cmpEvt) params.set('compareEventId', cmpEvt);
    }
    return params.toString();
  }, [customStart, customEnd]);

  const fetchDashboard = useCallback(async (f: string, r: RangePreset, cmp: CompareMode, cmpEvt: string) => {
    try {
      const qs = buildQuery(f, r, cmp, cmpEvt);
      const [dashRes, evtRes] = await Promise.all([
        fetch(`/api/admin/dashboard?${qs}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        allEvents.length > 0 ? Promise.resolve(null) : fetch('/api/admin/events', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      const dashData = await dashRes.json();
      setData(dashData);
      if (evtRes) {
        const evtData = await evtRes.json();
        setAllEvents(Array.isArray(evtData) ? evtData : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken, allEvents.length, buildQuery]);

  useEffect(() => {
    if (accessToken) fetchDashboard(filter, range, compareMode, compareEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleFilterChange = (f: string) => {
    setFilter(f);
    fetchDashboard(f, range, compareMode, compareEventId);
  };
  const handleRangeChange = (r: RangePreset) => {
    setRange(r);
    if (r !== 'custom') fetchDashboard(filter, r, compareMode, compareEventId);
  };
  const applyCustomRange = () => {
    if (customStart && customEnd) fetchDashboard(filter, 'custom', compareMode, compareEventId);
  };
  const handleCompareModeChange = (m: CompareMode) => {
    setCompareMode(m);
    if (m === 'event' && !compareEventId) return; // 이벤트 선택 후 다시 fetch
    fetchDashboard(filter, range, m, compareEventId);
  };
  const handleCompareEventChange = (id: string) => {
    setCompareEventId(id);
    if (compareMode === 'event' && id) fetchDashboard(filter, range, 'event', id);
  };
  const resetAll = () => {
    setFilter('all');
    setRange('30');
    setIndustryGroupFilter('all');
    setCompareMode('off');
    setCompareEventId('');
    fetchDashboard('all', '30', 'off', '');
  };

  // ===== Export =====
  // html2canvas는 Tailwind CSS 4가 쓰는 oklch()/lab()/color-mix() 등 현대 색상 함수를 파싱하지 못함.
  // 해결: 브라우저 Canvas 2D가 oklch를 네이티브로 파싱하므로 이를 이용해 rgb로 실제 변환 → 색상 의도 보존.
  //       그라디언트·box-shadow 같은 복합 값은 내부의 oklch(...) 부분만 찾아 치환.
  //       원본 DOM은 건드리지 않고 onclone 훅에서 복제본만 수정.
  const captureDashboard = async (el: HTMLElement): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import('html2canvas')).default;

    // 웹폰트가 로드된 상태에서 캡처 (한글 글꼴 안정화)
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }

    // 감지용 (false positive 최소화보다 완전성 우선)
    const UNSAFE_RE = /oklch\s*\(|oklab\s*\(|\blab\s*\(|\blch\s*\(|color-mix\s*\(|\bcolor\s*\(/i;
    // 감지·치환 대상 함수 이름 (color-mix는 color 앞에 있어야 prefix 매칭 충돌 방지)
    const COLOR_FN_NAMES = ['oklch', 'oklab', 'lab', 'lch', 'color-mix', 'color'] as const;
    const COLOR_PROPS = [
      'color', 'background-color',
      'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
      'outline-color', 'text-decoration-color', 'caret-color', 'accent-color',
      'fill', 'stroke',
    ] as const;

    // 1x1 픽셀 canvas에 실제로 그려서 getImageData로 sRGB 픽셀을 읽는 방식.
    // fillStyle getter는 브라우저에 따라 color(srgb ...) 같은 비-rgb 형식을 반환할 수 있으므로
    // 직렬화에 의존하지 않고 실제 렌더된 픽셀을 읽어 표준 rgb/rgba 문자열로 정규화.
    const convCtx = (() => {
      try {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        return c.getContext('2d', { willReadFrequently: true });
      } catch { return null; }
    })();

    const cache = new Map<string, string>();

    const canvasConvert = (color: string): string | null => {
      if (!convCtx) return null;
      const key = color.trim();
      if (cache.has(key)) { const v = cache.get(key)!; return v || null; }
      try {
        // 이전 호출 픽셀 제거 — 반투명 색상이 알파 합성되지 않도록
        convCtx.clearRect(0, 0, 1, 1);
        // fillStyle 유효성 검증: 파싱 실패 시 값이 그대로 유지됨 (spec)
        convCtx.fillStyle = '#000000';
        convCtx.fillStyle = color;
        // 유효하지 않은 색상이면 이전 값(#000000)이 유지됨 → 입력과 비교
        const serialized = String(convCtx.fillStyle).toLowerCase();
        const isBlackInput = /^(#000(000)?|rgb\(0,?\s*0,?\s*0\)|black)$/i.test(key);
        if (serialized === '#000000' && !isBlackInput) {
          cache.set(key, ''); return null;
        }
        // 실제 픽셀 그리기 → getImageData 로 sRGB 값 읽기
        convCtx.fillRect(0, 0, 1, 1);
        const data = convCtx.getImageData(0, 0, 1, 1).data;
        const r = data[0], g = data[1], b = data[2], a = data[3];
        const rgba = a === 255
          ? `rgb(${r}, ${g}, ${b})`
          : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
        cache.set(key, rgba);
        return rgba;
      } catch { return null; }
    };

    // balanced-paren 워커: 중첩 괄호(color-mix 안의 oklch 등)를 올바르게 스캔하여
    // 최외곽 색상 함수를 통째로 찾아 canvas-convert. 비-함수 문자는 그대로 유지.
    const toSafeCssValue = (v: string): string => {
      if (!v) return v;
      // 1차: 값 전체가 단일 색상이면 그대로 변환 (가장 빠름)
      const whole = canvasConvert(v.trim());
      if (whole) return whole;
      if (!UNSAFE_RE.test(v)) return v;

      // 2차: 함수 경계를 찾아 하나씩 치환 (gradient·shadow 등 복합 값 대응)
      let out = '';
      let i = 0;
      while (i < v.length) {
        const boundary = i === 0 || !/[a-zA-Z0-9_-]/.test(v[i - 1]);
        let matched = false;
        if (boundary) {
          for (const name of COLOR_FN_NAMES) {
            if (v.substring(i, i + name.length).toLowerCase() !== name) continue;
            let j = i + name.length;
            while (j < v.length && /\s/.test(v[j])) j++;
            if (v[j] !== '(') continue;
            // balanced close paren 찾기
            let depth = 1;
            let k = j + 1;
            while (k < v.length && depth > 0) {
              const ch = v[k];
              if (ch === '(') depth++;
              else if (ch === ')') depth--;
              k++;
            }
            if (depth !== 0) continue; // 짝 안 맞으면 skip
            const fullCall = v.substring(i, k);
            const conv = canvasConvert(fullCall);
            out += conv || '#888888';
            i = k;
            matched = true;
            break;
          }
        }
        if (!matched) { out += v[i]; i++; }
      }
      return out;
    };

    return html2canvas(el, {
      backgroundColor: '#f9fafb',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, clonedEl) => {
        const win = clonedDoc.defaultView;
        if (!win) return;

        // 모든 <details>를 "펼친 상태"로 강제 — 추출물에 상세 테이블도 포함되도록
        clonedEl.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));

        // 폰트·backdrop-filter 정리 + KPI 카드 글자 짤림 해결
        //   .truncate 의 overflow:hidden + line-height 반올림 때문에 html2canvas에서
        //   숫자 아랫부분이 1~2px 잘리는 버그가 있음 → 캡처 시 overflow visible 강제.
        const styleEl = clonedDoc.createElement('style');
        styleEl.textContent = `
          * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
          svg text, svg tspan { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }
          .truncate { overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
          /* KPI 카드 내부는 확실히 clipping 없이 렌더 */
          [data-export-group="kpi"] * { overflow: visible !important; }
          [data-export-group="kpi"] > div { min-height: 96px !important; }
          /* 라인 높이 여유로 숫자 꼬리 잘림 방지 */
          [data-export-group="kpi"] p { line-height: 1.35 !important; }
          /* details 펼쳤을 때 summary 삼각 아이콘 숨겨 깔끔하게 */
          details[open] > summary { list-style: none !important; cursor: default !important; }
          details[open] > summary::-webkit-details-marker { display: none !important; }
        `;
        clonedDoc.head.appendChild(styleEl);

        // === 핵심: :root (html) 의 모든 CSS 변수를 안전한 rgb로 덮어쓰기 ===
        // Tailwind 4는 --color-blue-500: oklch(...) 같은 팔레트를 :root에 선언.
        // 요소들은 color: var(--color-blue-500) 형태로 참조하므로, 루트에서 변수 자체를
        // 안전한 값으로 덮으면 cascade를 타고 전 DOM에 전파되어 html2canvas가
        // 어떤 경로로 색을 읽어도 unsafe 함수와 마주치지 않는다.
        const root = clonedDoc.documentElement;
        if (root) {
          const rootCs = win.getComputedStyle(root);
          for (let i = 0; i < rootCs.length; i++) {
            const propName = rootCs[i];
            if (!propName || !propName.startsWith('--')) continue;
            const val = rootCs.getPropertyValue(propName);
            if (val && UNSAFE_RE.test(val)) {
              root.style.setProperty(propName, toSafeCssValue(val));
            }
          }
        }

        // === 추가 안전장치: <style> 태그 raw 텍스트 sanitize ===
        // 일부 html2canvas 경로는 stylesheet rule 텍스트를 파싱할 수 있음.
        // 인라인 style 태그 내용에서 unsafe 색상 함수를 전부 rgb로 치환.
        clonedDoc.querySelectorAll<HTMLStyleElement>('style').forEach((st) => {
          const original = st.textContent;
          if (original && UNSAFE_RE.test(original)) {
            st.textContent = toSafeCssValue(original);
          }
        });

        // 개별 element 수준 — 인라인 style 및 computed color 변환 (기존 로직)
        const nodes = clonedEl.querySelectorAll<HTMLElement>('*');
        nodes.forEach((node) => {
          const cs = win.getComputedStyle(node);
          for (const prop of COLOR_PROPS) {
            const v = cs.getPropertyValue(prop);
            if (v && UNSAFE_RE.test(v)) {
              node.style.setProperty(prop, toSafeCssValue(v));
            }
          }
          const bg = cs.getPropertyValue('background-image');
          if (bg && UNSAFE_RE.test(bg)) {
            node.style.setProperty('background-image', toSafeCssValue(bg));
          }
          const boxShadow = cs.getPropertyValue('box-shadow');
          if (boxShadow && UNSAFE_RE.test(boxShadow)) {
            node.style.setProperty('box-shadow', toSafeCssValue(boxShadow));
          }
          const textShadow = cs.getPropertyValue('text-shadow');
          if (textShadow && UNSAFE_RE.test(textShadow)) {
            node.style.setProperty('text-shadow', toSafeCssValue(textShadow));
          }
          // 요소 자체에 선언된 CSS 변수도 처리 (inline style에 --tw-xxx 같은 커스텀 프로퍼티)
          for (let i = 0; i < cs.length; i++) {
            const pn = cs[i];
            if (!pn || !pn.startsWith('--')) continue;
            const pv = cs.getPropertyValue(pn);
            if (pv && UNSAFE_RE.test(pv)) {
              node.style.setProperty(pn, toSafeCssValue(pv));
            }
          }
        });

        // SVG attribute — Recharts 차트 대응
        const svgColored = clonedEl.querySelectorAll<SVGElement>('svg [fill], svg [stroke]');
        svgColored.forEach((n) => {
          const f = n.getAttribute('fill');
          if (f && UNSAFE_RE.test(f)) n.setAttribute('fill', toSafeCssValue(f));
          const s = n.getAttribute('stroke');
          if (s && UNSAFE_RE.test(s)) n.setAttribute('stroke', toSafeCssValue(s));
        });
      },
    });
  };

  // 대시보드 내부의 논리적 섹션을 순서대로 수집 (data-export-group 속성 기준)
  const getExportSections = (): HTMLElement[] => {
    if (!dashboardRef.current) return [];
    return Array.from(dashboardRef.current.querySelectorAll<HTMLElement>('[data-export-group]'));
  };

  const exportAsPdf = async () => {
    if (!dashboardRef.current) return;
    setExporting('pdf'); setShowExportMenu(false);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const PAGE_W = 210, PAGE_H = 297, MARGIN = 10;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const CONTENT_H = PAGE_H - MARGIN * 2;

      const sections = getExportSections();
      const targets = sections.length > 0 ? sections : [dashboardRef.current];

      let cursorY = MARGIN;
      let isFirstPage = true;

      for (const section of targets) {
        const canvas = await captureDashboard(section);
        const imgData = canvas.toDataURL('image/png');
        const ratio = CONTENT_W / canvas.width;
        const sectionH = canvas.height * ratio;

        if (sectionH <= CONTENT_H) {
          // 섹션이 한 페이지에 들어감 — 현재 커서 위치 확인
          if (!isFirstPage && cursorY + sectionH > PAGE_H - MARGIN) {
            doc.addPage(); cursorY = MARGIN;
          }
          doc.addImage(imgData, 'PNG', MARGIN, cursorY, CONTENT_W, sectionH);
          cursorY += sectionH + 6; // 섹션 간 6mm 간격
          isFirstPage = false;
        } else {
          // 섹션이 한 페이지보다 큼 — 새 페이지에서 시작해 여러 페이지에 걸쳐 렌더
          if (!isFirstPage) { doc.addPage(); cursorY = MARGIN; }
          let offset = 0;
          let firstChunk = true;
          while (offset < sectionH) {
            if (!firstChunk) { doc.addPage(); }
            doc.addImage(imgData, 'PNG', MARGIN, MARGIN - offset, CONTENT_W, sectionH);
            offset += CONTENT_H;
            firstChunk = false;
          }
          cursorY = MARGIN;
          isFirstPage = false;
          // 다음 섹션은 무조건 새 페이지에서 시작
          if (offset >= sectionH) { doc.addPage(); cursorY = MARGIN; }
        }
      }

      doc.save(`cloocus_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert('PDF 오류: ' + String(err));
    } finally { setExporting(null); }
  };

  const exportAsExcel = async () => {
    if (!data) return;
    setExporting('xlsx'); setShowExportMenu(false);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const summaryData = [
        { '항목': '총 등록수', '값': data.kpi.total },
        { '항목': '오늘 등록', '값': data.kpi.today },
        { '항목': '오늘 증감(%)', '값': data.kpi.todayDeltaPct.toFixed(1) + '%' },
        { '항목': '최다 산업군(그룹)', '값': data.kpi.topIndustryGroup },
        { '항목': '최다 신청 경로', '값': data.kpi.topSource },
        { '항목': '최다 추천인', '값': `${data.kpi.topReferrer.name} (${data.kpi.topReferrer.value})` },
        { '항목': '설문 완료율', '값': (data.kpi.surveyCompletionRate * 100).toFixed(1) + '%' },
        { '항목': '수료증 발급율', '값': (data.kpi.certificateRate * 100).toFixed(1) + '%' },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws1, '요약');

      const funnelData = [
        { '단계': '등록', '건수': data.funnel.registered, '전단계대비': '100%' },
        { '단계': '설문 완료', '건수': data.funnel.surveyCompleted, '전단계대비': data.funnel.registered > 0 ? ((data.funnel.surveyCompleted / data.funnel.registered) * 100).toFixed(1) + '%' : '-' },
        { '단계': '수료증 발급', '건수': data.funnel.certificateIssued, '전단계대비': data.funnel.surveyCompleted > 0 ? ((data.funnel.certificateIssued / data.funnel.surveyCompleted) * 100).toFixed(1) + '%' : '-' },
      ];
      const wsF = XLSX.utils.json_to_sheet(funnelData);
      wsF['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsF, '퍼널');

      const ws2 = XLSX.utils.json_to_sheet(data.byDay.map((d) => ({ '날짜': d.date, '등록수': d.count })));
      ws2['!cols'] = [{ wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, '일별 등록');

      const ws3 = XLSX.utils.json_to_sheet(data.byIndustryGroup.map((d) => ({ '산업군(차트 라벨)': d.name, '등록수': d.value })));
      ws3['!cols'] = [{ wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3, '산업군(차트)');

      const ws3d = XLSX.utils.json_to_sheet(data.byIndustryDetail.map((d) => ({ '차트 라벨': d.chartLabel, '상세 산업군(원본)': d.industry, '등록수': d.value })));
      ws3d['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws3d, '산업군(상세)');

      const ws4 = XLSX.utils.json_to_sheet(data.byEvent.map((d) => ({
        '이벤트': d.name, '등록수': d.total, '설문완료': d.surveyCompleted, '수료증발급': d.certificateIssued,
        '설문완료율': (d.surveyRate * 100).toFixed(1) + '%',
      })));
      ws4['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws4, '이벤트별');

      const ws5 = XLSX.utils.json_to_sheet(data.bySource.map((d) => ({ '신청 경로': d.name, '등록수': d.value })));
      ws5['!cols'] = [{ wch: 25 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws5, '신청 경로');

      if (data.topReferrers.length > 0) {
        const wsR = XLSX.utils.json_to_sheet(data.topReferrers.map((d, i) => ({ '순위': i + 1, '추천인': d.name, '추천 건수': d.value })));
        wsR['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsR, 'Top 추천인');
      }

      if (data.byUtm.bySource.length + data.byUtm.byMedium.length + data.byUtm.byCampaign.length > 0) {
        const wsU = XLSX.utils.json_to_sheet([
          ...data.byUtm.bySource.map((d) => ({ '구분': 'source', '값': d.name, '등록수': d.value })),
          ...data.byUtm.byMedium.map((d) => ({ '구분': 'medium', '값': d.name, '등록수': d.value })),
          ...data.byUtm.byCampaign.map((d) => ({ '구분': 'campaign', '값': d.name, '등록수': d.value })),
        ]);
        wsU['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsU, 'UTM');
      }

      XLSX.writeFile(wb, `cloocus_dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      // ignore
    } finally { setExporting(null); }
  };

  const exportAsPptx = async () => {
    if (!dashboardRef.current || !data) return;
    setExporting('pptx'); setShowExportMenu(false);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inch

      // 슬라이드 상수 (inch)
      const SLIDE_W = 13.333, SLIDE_H = 7.5;
      const MARGIN = 0.4;
      const TITLE_H = 0.65;

      // 1. 타이틀 슬라이드
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Cloocus 이벤트 대시보드', {
        x: 0.5, y: 2.6, w: SLIDE_W - 1, h: 0.9, fontSize: 36, bold: true, color: '2563eb', align: 'center',
      });
      titleSlide.addText(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), {
        x: 0.5, y: 3.6, w: SLIDE_W - 1, h: 0.5, fontSize: 18, color: '666666', align: 'center',
      });
      titleSlide.addText(
        `총 등록 ${data.kpi.total.toLocaleString()}  |  오늘 ${data.kpi.today} (${data.kpi.todayDeltaPct >= 0 ? '+' : ''}${data.kpi.todayDeltaPct.toFixed(0)}%)  |  설문 완료율 ${(data.kpi.surveyCompletionRate * 100).toFixed(1)}%`,
        { x: 0.5, y: 4.3, w: SLIDE_W - 1, h: 0.5, fontSize: 14, color: '444444', align: 'center' }
      );
      if (data.range.start && data.range.end) {
        titleSlide.addText(`분석 기간: ${data.range.start} ~ ${data.range.end}`, {
          x: 0.5, y: 4.85, w: SLIDE_W - 1, h: 0.4, fontSize: 12, color: '888888', align: 'center',
        });
      }

      // 2. 섹션별 슬라이드
      const sections = getExportSections();
      const targets = sections.length > 0 ? sections : (dashboardRef.current ? [dashboardRef.current] : []);

      for (const section of targets) {
        const title = section.getAttribute('data-export-title') || '';
        const canvas = await captureDashboard(section);
        const imgData = canvas.toDataURL('image/png');

        const slide = pptx.addSlide();
        if (title) {
          slide.addText(title, {
            x: MARGIN, y: MARGIN, w: SLIDE_W - MARGIN * 2, h: TITLE_H,
            fontSize: 22, bold: true, color: '111827',
          });
        }

        // 본문 영역: 타이틀 아래 남은 공간
        const contentTop = MARGIN + TITLE_H;
        const contentW = SLIDE_W - MARGIN * 2;
        const contentH = SLIDE_H - contentTop - MARGIN;

        // 이미지 aspect fit (세로·가로 중 긴 쪽 기준)
        const imgRatio = canvas.width / canvas.height;
        let w = contentW;
        let h = w / imgRatio;
        if (h > contentH) { h = contentH; w = h * imgRatio; }
        const x = (SLIDE_W - w) / 2;
        const y = contentTop + (contentH - h) / 2;

        slide.addImage({ data: imgData, x, y, w, h });
      }

      await pptx.writeFile({ fileName: `cloocus_dashboard_${new Date().toISOString().slice(0, 10)}.pptx` });
    } catch (err) {
      alert('PPT 오류: ' + String(err));
    } finally { setExporting(null); }
  };

  // 상세 산업군 테이블 — 차트 라벨 필터 적용
  const filteredIndustryDetail = useMemo(() => {
    if (!data) return [];
    if (industryGroupFilter === 'all') return data.byIndustryDetail;
    return data.byIndustryDetail.filter((d) => d.chartLabel === industryGroupFilter);
  }, [data, industryGroupFilter]);

  const utmKey = utmTab === 'source' ? 'bySource' : utmTab === 'medium' ? 'byMedium' : 'byCampaign';
  const utmEntries = useMemo(() => (data ? data.byUtm[utmKey] : []), [data, utmKey]);
  const visitUtmKey = visitUtmTab === 'source' ? 'bySource' : visitUtmTab === 'medium' ? 'byMedium' : 'byCampaign';

  // 비교 모드용 — primary + compare merged by name (bar charts)
  const mergeForCompare = useCallback((primary: { name: string; value: number }[], compare?: { name: string; value: number }[]) => {
    if (!compare) return primary.map((p) => ({ name: p.name, primary: p.value, compare: 0 }));
    const map = new Map<string, { primary: number; compare: number }>();
    for (const p of primary) map.set(p.name, { primary: p.value, compare: 0 });
    for (const c of compare) {
      const cur = map.get(c.name);
      if (cur) cur.compare = c.value;
      else map.set(c.name, { primary: 0, compare: c.value });
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, primary: v.primary, compare: v.compare }))
      .sort((a, b) => (b.primary + b.compare) - (a.primary + a.compare))
      .slice(0, 10);
  }, []);

  // 일별 — primary+compare 을 index로 정렬 (날짜 길이가 같아야 의미있는 비교)
  const dayCompareSeries = useMemo(() => {
    if (!data) return [];
    const primary = data.byDay;
    const compare = data.compare?.byDay;
    if (!compare) return primary.map((d) => ({ date: d.date, primary: d.count, compare: null as number | null }));
    const len = Math.max(primary.length, compare.length);
    const out: { date: string; primary: number | null; compare: number | null }[] = [];
    for (let i = 0; i < len; i++) {
      out.push({
        date: primary[i]?.date || compare[i]?.date || '',
        primary: primary[i]?.count ?? null,
        compare: compare[i]?.count ?? null,
      });
    }
    return out;
  }, [data]);

  const sourceCompareData = useMemo(() => data ? mergeForCompare(data.bySource, data.compare?.bySource) : [], [data, mergeForCompare]);
  const utmCompareData = useMemo(() => {
    if (!data) return [];
    return mergeForCompare(data.byUtm[utmKey], data.compare?.byUtm[utmKey]);
  }, [data, utmKey, mergeForCompare]);

  if (loading) return <p className="text-gray-400">데이터 로딩 중...</p>;
  if (!data) return <p className="text-gray-400">데이터를 불러올 수 없습니다.</p>;

  const { kpi, funnel } = data;
  const deltaSign = kpi.todayDeltaPct > 0 ? '+' : '';
  const deltaColor = kpi.todayDeltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600';
  const deltaBg = kpi.todayDeltaPct >= 0 ? 'bg-emerald-50' : 'bg-rose-50';

  const funnelStages = [
    { label: '등록', value: funnel.registered, prev: funnel.registered, color: '#2563eb' },
    { label: '설문 완료', value: funnel.surveyCompleted, prev: funnel.registered, color: '#7c3aed' },
    { label: '수료증 발급', value: funnel.certificateIssued, prev: funnel.surveyCompleted, color: '#059669' },
  ];

  return (
    <div>
      {/* ===== 전역 필터 바 (sticky) ===== */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">마케팅 대시보드</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 이벤트 */}
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🎯 전체 이벤트</option>
              <optgroup label="유형별">
                <option value="online">온라인</option>
                <option value="offline">오프라인</option>
              </optgroup>
              {allEvents.length > 0 && (
                <optgroup label="이벤트별">
                  {allEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* 기간 */}
            <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
              {(['7', '14', '30'] as RangePreset[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`text-sm px-3 py-2 ${range === r ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                >
                  최근 {r}일
                </button>
              ))}
              <button
                onClick={() => handleRangeChange('custom')}
                className={`text-sm px-3 py-2 border-l border-gray-300 ${range === 'custom' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              >
                직접 설정
              </button>
            </div>

            {range === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white" />
                <span className="text-gray-400 text-xs">~</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white" />
                <button onClick={applyCustomRange} className="btn-secondary text-sm py-1.5">적용</button>
              </div>
            )}

            {/* 비교 모드 */}
            <select
              value={compareMode}
              onChange={(e) => handleCompareModeChange(e.target.value as CompareMode)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="off">🔀 비교 끄기</option>
              <option value="prev">전기간 대비</option>
              <option value="event">이벤트 비교</option>
            </select>
            {compareMode === 'event' && (
              <select
                value={compareEventId}
                onChange={(e) => handleCompareEventChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">비교할 이벤트 선택</option>
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id} disabled={evt.id === filter}>{evt.name}</option>
                ))}
              </select>
            )}

            <button onClick={resetAll} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2">↻ 초기화</button>

            <div className="relative" ref={exportMenuRef}>
              <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={!!exporting} className="btn-secondary text-sm">
                {exporting ? '내보내는 중...' : '내보내기 ▾'}
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px]">
                  <button onClick={exportAsPdf} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-t-lg">📄 PDF</button>
                  <button onClick={exportAsExcel} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-t border-gray-100">📊 엑셀 (XLSX)</button>
                  <button onClick={exportAsPptx} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-b-lg border-t border-gray-100">📽️ PPT (PPTX)</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 활성 필터 뱃지 */}
        {(filter !== 'all' || range !== '30' || compareMode !== 'off') && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {filter !== 'all' && (
              <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                🎯 {filter === 'online' ? '온라인' : filter === 'offline' ? '오프라인' : allEvents.find((e) => e.id === filter)?.name || filter}
              </span>
            )}
            {range !== '30' && range !== 'custom' && (
              <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium">📅 최근 {range}일</span>
            )}
            {range === 'custom' && customStart && customEnd && (
              <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium">📅 {customStart} ~ {customEnd}</span>
            )}
            {data.compare && (
              <span className="text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full font-medium">
                🔀 비교: {data.compare.label}
              </span>
            )}
          </div>
        )}
      </div>

      <div ref={dashboardRef}>
        {/* ===== L1. KPI 카드 ===== */}
        <div data-export-group="kpi" data-export-title="KPI 요약" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          <KpiCard label="총 등록수" value={kpi.total.toLocaleString()} tone="blue" />
          <KpiCard
            label="오늘 등록"
            value={kpi.today.toLocaleString()}
            tone="green"
            badge={(
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${deltaBg} ${deltaColor}`}>
                {deltaSign}{kpi.todayDeltaPct.toFixed(0)}%
              </span>
            )}
            subtext={`전일 ${kpi.yesterdayCount}건`}
          />
          <KpiCard label="최다 산업군" value={kpi.topIndustryGroup} tone="purple" />
          <KpiCard label="최다 신청 경로" value={kpi.topSource} tone="amber" small />
          <KpiCard
            label="최다 추천인"
            value={kpi.topReferrer.name}
            tone="rose"
            subtext={`${kpi.topReferrer.value}건 추천`}
            small
          />
          <KpiCard
            label="설문 완료율"
            value={`${(kpi.surveyCompletionRate * 100).toFixed(1)}%`}
            tone="teal"
            subtext={`수료 ${(kpi.certificateRate * 100).toFixed(0)}%`}
          />
        </div>

        {/* ===== L2. 전환 퍼널 (Hero) ===== */}
        <div data-export-group="funnel" data-export-title="전환 퍼널" className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">전환 퍼널</h3>
              <p className="text-xs text-gray-500 mt-0.5">등록 후 참여 품질 흐름 · 드롭오프 지점을 식별하세요</p>
            </div>
            {data.compare && (
              <div className="text-right text-xs">
                <p className="text-gray-500">비교: <span className="font-medium text-orange-600">{data.compare.label}</span></p>
                <p className="text-gray-700 mt-0.5">
                  등록 <span className="font-semibold">{data.compare.funnel.registered}</span> · 설문완료율 <span className="font-semibold">{(data.compare.surveyCompletionRate * 100).toFixed(0)}%</span>
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {funnelStages.map((s, i) => {
              const pct = s.prev > 0 ? (s.value / s.prev) * 100 : 0;
              const maxVal = funnelStages[0].value || 1;
              const barW = (s.value / maxVal) * 100;
              return (
                <div key={s.label} className="relative">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    {i > 0 && (
                      <span className={`text-xs font-semibold ${pct >= 50 ? 'text-emerald-600' : pct >= 20 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="h-12 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div className="h-full transition-all" style={{ width: `${barW}%`, backgroundColor: s.color }} />
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg drop-shadow-sm">
                      {s.value.toLocaleString()}
                    </span>
                  </div>
                  {i === 0 && <p className="text-[10px] text-gray-400 mt-1">기준점</p>}
                  {i > 0 && <p className="text-[10px] text-gray-400 mt-1">전 단계 대비 전환</p>}
                </div>
              );
            })}
          </div>
          {funnel.registered > 0 && (funnel.surveyCompleted / funnel.registered) < 0.3 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              ⚠️ 설문 완료율이 30% 미만입니다. 리드 품질 저하 또는 설문 접근성 이슈가 의심됩니다.
            </div>
          )}
        </div>

        {/* ===== L3. 획득 (Acquisition) — 일별 추이 + 신청 경로 + UTM ===== */}
        <div data-export-group="acquisition" data-export-title="획득 — 일별 등록 추이 & 유입 채널" className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* 일별 추이 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-1">일별 등록 추이 {data.compare && <span className="text-xs text-orange-600 font-normal">· 비교 활성</span>}</h3>
            <p className="text-xs text-gray-500 mb-4">
              {data.range.start && data.range.end ? `${data.range.start} ~ ${data.range.end}` : '전체 기간'}
              {data.compare && <span className="text-orange-600"> vs {data.compare.label}</span>}
            </p>
            {data.byDay.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dayCompareSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    {data.compare && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    <Line type="monotone" dataKey="primary" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="현재" />
                    {data.compare && (
                      <Line type="monotone" dataKey="compare" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} name={data.compare.label} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상세 테이블 보기 ({data.byDay.length}일)</summary>
                  <table className="w-full text-xs mt-2 border-collapse">
                    <thead><tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left border border-gray-200">#</th>
                      <th className="px-3 py-2 text-right border border-gray-200">현재</th>
                      {data.compare && <th className="px-3 py-2 text-right border border-gray-200 text-orange-600">비교</th>}
                    </tr></thead>
                    <tbody>{dayCompareSeries.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 border border-gray-200">{d.date || `#${i + 1}`}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.primary ?? '-'}</td>
                        {data.compare && <td className="px-3 py-1.5 text-right border border-gray-200 text-orange-600">{d.compare ?? '-'}</td>}
                      </tr>
                    ))}</tbody>
                  </table>
                </details>
              </>
            ) : (
              <p className="text-gray-400 text-sm h-[260px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* UTM 채널 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">등록 기준 유입 채널</h3>
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-xs">
                {(['source', 'medium', 'campaign'] as const).map((t) => (
                  <button key={t} onClick={() => setUtmTab(t)} className={`px-2.5 py-1 ${utmTab === t ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">등록 시점 first-touch UTM · UTM 없이 등록한 사용자는 <em>(direct)</em> · 상위 10개</p>
            {utmEntries.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={utmCompareData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                    <Tooltip />
                    {data.compare && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    <Bar dataKey="primary" fill="#0891b2" radius={[0, 4, 4, 0]} name={data.compare ? '현재' : '등록수'} />
                    {data.compare && <Bar dataKey="compare" fill="#f97316" radius={[0, 4, 4, 0]} name={data.compare.label} />}
                  </BarChart>
                </ResponsiveContainer>
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상세 테이블 보기</summary>
                  <table className="w-full text-xs mt-2 border-collapse">
                    <thead><tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left border border-gray-200">{utmTab}</th>
                      <th className="px-3 py-2 text-right border border-gray-200">현재</th>
                      {data.compare && <th className="px-3 py-2 text-right border border-gray-200 text-orange-600">비교</th>}
                    </tr></thead>
                    <tbody>{utmCompareData.map((d) => (
                      <tr key={d.name}>
                        <td className="px-3 py-1.5 border border-gray-200">{d.name}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.primary}</td>
                        {data.compare && <td className="px-3 py-1.5 text-right border border-gray-200 text-orange-600">{d.compare}</td>}
                      </tr>
                    ))}</tbody>
                  </table>
                </details>
              </>
            ) : (
              <div className="text-sm h-[260px] flex flex-col items-center justify-center gap-2 text-gray-400">
                <p>등록 데이터가 아직 없습니다</p>
                <p className="text-xs text-gray-400">캠페인 효과 측정을 위해 링크에 <code className="px-1 bg-gray-100 rounded">?utm_source=...&utm_medium=...&utm_campaign=...</code> 파라미터를 붙여 배포하세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== L3.5 방문 기준 UTM — page_events에서 집계 (등록과는 별개로 캠페인 도달 측정) ===== */}
        <div data-export-group="visit-utm" data-export-title="방문 기준 UTM — 캠페인 도달" className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="font-semibold">방문 기준 유입 채널</h3>
            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-xs">
              {(['source', 'medium', 'campaign'] as const).map((t) => (
                <button key={t} onClick={() => setVisitUtmTab(t)} className={`px-2.5 py-1 ${visitUtmTab === t ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            page_events 기반 · UTM 유무 관계없이 모든 방문 집계 (UTM 없으면 <em>(direct)</em>로 묶임)
            {data.visitUtm && (
              <> · <strong className="text-gray-700">{data.visitUtm.totalVisits}건</strong> ({data.visitUtm.uniqueSessions} 세션)</>
            )}
          </p>
          {data.visitUtm && data.visitUtm[visitUtmKey] && data.visitUtm[visitUtmKey].length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.visitUtm[visitUtmKey]} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={130} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} name="방문수" />
                </BarChart>
              </ResponsiveContainer>
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상세 테이블 보기 (등록 전환율 비교)</summary>
                <table className="w-full text-xs mt-2 border-collapse">
                  <thead><tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left border border-gray-200">{visitUtmTab}</th>
                    <th className="px-3 py-2 text-right border border-gray-200">방문</th>
                    <th className="px-3 py-2 text-right border border-gray-200">등록</th>
                    <th className="px-3 py-2 text-right border border-gray-200">전환율</th>
                  </tr></thead>
                  <tbody>{data.visitUtm[visitUtmKey].map((d) => {
                    const reg = data.byUtm[visitUtmKey].find((r) => r.name === d.name)?.value || 0;
                    const conv = d.value > 0 ? (reg / d.value) * 100 : 0;
                    return (
                      <tr key={d.name}>
                        <td className="px-3 py-1.5 border border-gray-200">{d.name}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.value}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200">{reg}</td>
                        <td className="px-3 py-1.5 text-right border border-gray-200 text-gray-600">{conv.toFixed(1)}%</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </details>
            </>
          ) : (
            <div className="text-sm h-[200px] flex flex-col items-center justify-center gap-2 text-gray-400">
              <p>방문 UTM 데이터가 아직 없습니다</p>
              <p className="text-xs text-gray-400">UTM 링크 배포 후 첫 방문이 발생하면 즉시 집계됩니다.</p>
            </div>
          )}
        </div>

        {/* ===== L4. 오디언스 — 산업군 그룹 + 이벤트 비교 ===== */}
        <div data-export-group="audience" data-export-title="오디언스 — 산업군 & 이벤트별 등록" className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* 산업군 도넛 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-1">산업군 분포</h3>
            <p className="text-xs text-gray-500 mb-4">차트는 괄호 안 내용을 생략한 라벨로 표시 · 상세 원본값은 아래 테이블</p>
            {data.byIndustryGroup.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.byIndustryGroup} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={45} label={false}>
                      {data.byIndustryGroup.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}건`]} />
                    <Legend
                      layout="horizontal" verticalAlign="bottom" align="center"
                      wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                      formatter={(value: string) => {
                        const item = data.byIndustryGroup.find((d) => d.name === value);
                        const pct = item && kpi.total > 0 ? ((item.value / kpi.total) * 100).toFixed(0) : '0';
                        return `${value} ${pct}%`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">상세 산업군 (원본값)</span>
                    <select
                      value={industryGroupFilter}
                      onChange={(e) => setIndustryGroupFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                    >
                      <option value="all">전체 라벨</option>
                      {data.byIndustryGroup.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="max-h-[220px] overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left border border-gray-200">차트 라벨</th>
                          <th className="px-3 py-2 text-left border border-gray-200">상세 산업군</th>
                          <th className="px-3 py-2 text-right border border-gray-200">등록수</th>
                          <th className="px-3 py-2 text-right border border-gray-200">비율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIndustryDetail.map((d) => {
                          const pct = kpi.total > 0 ? ((d.value / kpi.total) * 100).toFixed(1) : '0';
                          return (
                            <tr key={d.industry}>
                              <td className="px-3 py-1.5 border border-gray-200 text-gray-500">{d.chartLabel}</td>
                              <td className="px-3 py-1.5 border border-gray-200">{d.industry}</td>
                              <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.value}</td>
                              <td className="px-3 py-1.5 text-right border border-gray-200">{pct}%</td>
                            </tr>
                          );
                        })}
                        {filteredIndustryDetail.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400 border border-gray-200">해당 라벨에 데이터 없음</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* 이벤트별 — 등록 + 설문완료율 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-1">이벤트별 등록 & 품질</h3>
            <p className="text-xs text-gray-500 mb-4">등록 수(양) + 설문 완료율(질) 동시 비교</p>
            {data.byEvent.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(260, data.byEvent.length * 36)}>
                  <BarChart data={data.byEvent} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={160} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} name="등록수" />
                  </BarChart>
                </ResponsiveContainer>
                <details className="mt-3" open>
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상세 테이블</summary>
                  <table className="w-full text-xs mt-2 border-collapse">
                    <thead><tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left border border-gray-200">이벤트</th>
                      <th className="px-3 py-2 text-right border border-gray-200">등록</th>
                      <th className="px-3 py-2 text-right border border-gray-200">설문완료</th>
                      <th className="px-3 py-2 text-right border border-gray-200">완료율</th>
                      <th className="px-3 py-2 text-right border border-gray-200">수료</th>
                    </tr></thead>
                    <tbody>{data.byEvent.map((d) => {
                      const rateColor = d.surveyRate >= 0.5 ? 'text-emerald-600' : d.surveyRate >= 0.2 ? 'text-amber-600' : 'text-rose-600';
                      return (
                        <tr key={d.name}>
                          <td className="px-3 py-1.5 border border-gray-200">{d.name}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.total}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{d.surveyCompleted}</td>
                          <td className={`px-3 py-1.5 text-right border border-gray-200 font-semibold ${rateColor}`}>{(d.surveyRate * 100).toFixed(0)}%</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200">{d.certificateIssued}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </details>
              </>
            ) : (
              <p className="text-gray-400 text-sm h-[260px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>
        </div>

        {/* ===== L5. 신청 경로 + Top 추천인 ===== */}
        <div data-export-group="source-referrer" data-export-title="신청 경로 & Top 추천인" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 신청 경로 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-1">신청 경로 (자가 응답)</h3>
            <p className="text-xs text-gray-500 mb-4">사용자가 직접 선택한 경로 · UTM과 교차 비교하면 브랜드 기여도 확인 가능</p>
            {data.bySource.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sourceCompareData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={160} />
                    <Tooltip />
                    {data.compare && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    <Bar dataKey="primary" fill="#7c3aed" radius={[0, 4, 4, 0]} name={data.compare ? '현재' : '등록수'} />
                    {data.compare && <Bar dataKey="compare" fill="#f97316" radius={[0, 4, 4, 0]} name={data.compare.label} />}
                  </BarChart>
                </ResponsiveContainer>
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">상세 테이블</summary>
                  <table className="w-full text-xs mt-2 border-collapse">
                    <thead><tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left border border-gray-200">신청 경로</th>
                      <th className="px-3 py-2 text-right border border-gray-200">{data.compare ? '현재' : '등록수'}</th>
                      {data.compare && <th className="px-3 py-2 text-right border border-gray-200 text-orange-600">비교</th>}
                      {!data.compare && <th className="px-3 py-2 text-right border border-gray-200">비율</th>}
                    </tr></thead>
                    <tbody>{sourceCompareData.map((d) => {
                      const pct = kpi.total > 0 ? ((d.primary / kpi.total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={d.name}>
                          <td className="px-3 py-1.5 border border-gray-200">{d.name}</td>
                          <td className="px-3 py-1.5 text-right border border-gray-200 font-medium">{d.primary}</td>
                          {data.compare && <td className="px-3 py-1.5 text-right border border-gray-200 text-orange-600">{d.compare}</td>}
                          {!data.compare && <td className="px-3 py-1.5 text-right border border-gray-200">{pct}%</td>}
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </details>
              </>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">데이터 없음</p>
            )}
          </div>

          {/* Top 추천인 리더보드 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-1">Top 추천인</h3>
            <p className="text-xs text-gray-500 mb-4">추천 건수 상위 10명 · 앰배서더 프로그램 및 인센티브 근거</p>
            {data.topReferrers.length > 0 ? (
              <div className="space-y-2">
                {data.topReferrers.map((r, i) => {
                  const maxV = data.topReferrers[0].value || 1;
                  const w = (r.value / maxV) * 100;
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                  return (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-sm font-semibold w-10 text-center">{medal}</span>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-medium">{r.name}</span>
                          <span className="text-xs text-gray-500">{r.value}건</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm h-[280px] flex items-center justify-center">추천인 데이터 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type KpiTone = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'teal';
const TONE: Record<KpiTone, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  teal: 'bg-teal-50 text-teal-700',
};

function KpiCard({ label, value, tone, subtext, badge, small }: {
  label: string;
  value: string | number;
  tone: KpiTone;
  subtext?: string;
  badge?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${TONE[tone]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-70">{label}</p>
        {badge}
      </div>
      <p className={`font-bold mt-1 truncate ${small ? 'text-lg' : 'text-2xl'}`} title={String(value)}>{value}</p>
      {subtext && <p className="text-[10px] opacity-60 mt-1">{subtext}</p>}
    </div>
  );
}
