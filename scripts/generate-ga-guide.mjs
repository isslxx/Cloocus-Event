import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { writeFileSync } from 'fs';

const BLUE = '2563eb';
const GRAY = '6b7280';
const DARK = '111827';

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 36, color: DARK })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 160 },
  children: [new TextRun({ text, bold: true, size: 28, color: BLUE })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, bold: true, size: 24, color: DARK })],
});

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, size: 22, color: opts.color || DARK, bold: opts.bold })],
});

const bullet = (text) => new Paragraph({
  bullet: { level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, size: 22 })],
});

const kv = (label, value) => new Paragraph({
  spacing: { after: 80 },
  children: [
    new TextRun({ text: `• ${label}: `, bold: true, size: 22, color: BLUE }),
    new TextRun({ text: value, size: 22 }),
  ],
});

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 25, type: WidthType.PERCENTAGE },
    shading: opts.header ? { type: ShadingType.SOLID, color: 'E5E7EB', fill: 'E5E7EB' } : undefined,
    children: [new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text, size: 20, bold: opts.header, color: opts.header ? DARK : undefined })],
    })],
  });
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => cell(h, { header: true, width: Math.floor(100 / headers.length) })),
      }),
      ...rows.map((row) => new TableRow({
        children: row.map((c) => cell(c, { width: Math.floor(100 / headers.length) })),
      })),
    ],
  });
}

const spacer = () => new Paragraph({ spacing: { after: 100 }, children: [new TextRun('')] });

const doc = new Document({
  creator: 'Cloocus',
  title: 'GA4 대시보드 효율 활용 가이드',
  styles: {
    default: {
      document: { run: { font: 'Malgun Gothic' } },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
    },
    children: [
      // 표지
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [new TextRun({ text: 'GA4 대시보드', bold: true, size: 48, color: BLUE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: '효율 활용 가이드', bold: true, size: 40, color: DARK })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: 'Cloocus Event System · Google Analytics 4 (G-NHQ22J3WC4)', size: 20, color: GRAY })],
      }),

      // 1. 초기 세팅
      h1('1. 초기 세팅 (필수 체크)'),
      p('GA4는 기본 설정만으로는 장기 분석이나 정교한 트래킹이 어렵습니다. 아래 항목부터 설정해주세요.'),
      spacer(),
      makeTable(
        ['항목', '경로', '이유'],
        [
          ['데이터 보존 기간 변경', '관리 → 데이터 수집 및 수정 → 데이터 보존', '기본 2개월 → 14개월로 변경. 코호트 분석 가능'],
          ['Google Signals 활성화', '관리 → 데이터 수집 및 수정 → 데이터 수집', '디바이스 간 사용자 추적, 인구통계'],
          ['보고용 ID 설정', '관리 → 보고 ID', '"기기 기반 우선"으로 설정하면 정확도 향상'],
          ['내부 IP 제외', '관리 → 데이터 스트림 → 태그 설정 → 내부 트래픽 정의', '회사 IP는 제외해서 데이터 오염 방지'],
        ]
      ),
      spacer(),

      // 2. 커스텀 이벤트
      h1('2. 커스텀 이벤트 (적용 완료)'),
      p('현재 시스템에 자동 추적되는 이벤트 목록입니다. Cloocus Event System에 구현 완료.'),
      spacer(),
      makeTable(
        ['이벤트명', '의미', '파라미터'],
        [
          ['event_view', '이벤트 카드 클릭', 'event_name_label, event_category'],
          ['form_start', '등록 폼 진입', 'event_name_label, event_category'],
          ['form_submit', '등록 완료 (핵심 전환)', 'event_name_label, event_category, referral_source'],
          ['portal_login', '신청자 포털 로그인', '-'],
          ['survey_complete', '설문조사 완료', 'event_name_label, event_category'],
          ['certificate_download', '수료증 다운로드', 'event_name_label, event_category'],
        ]
      ),
      spacer(),
      p('* 위 이벤트들은 GA4 → 보고서 → 참여도 → 이벤트에서 확인할 수 있습니다.', { color: GRAY }),
      p('* 이벤트 파라미터를 보고서에 표시하려면 관리 → 맞춤 정의 → 맞춤 측정기준에서 등록 필요.', { color: GRAY }),
      spacer(),

      // 3. 주간 루틴
      h1('3. 대시보드 주간 확인 루틴'),
      h3('실시간 보고서'),
      bullet('현재 접속자 수, 어떤 페이지, 어느 지역에서 들어오는지'),
      h3('획득 → 트래픽 획득'),
      bullet('유입 경로(Organic/Direct/Referral/Social) 비중'),
      bullet('"어디서 왔는지" 파악하여 마케팅 채널 효율 측정'),
      h3('참여도 → 페이지 및 화면'),
      bullet('페이지별 조회수, 체류시간, 이탈률'),
      bullet('/my 체류시간이 짧다면 UX 개선 필요'),
      h3('인구통계'),
      bullet('사용자 지역(서울/부산 등), 디바이스(모바일/데스크톱)'),
      bullet('모바일 비율 높으면 모바일 UX 최우선'),
      spacer(),

      // 4. 탐색 기능
      h1('4. 탐색(Explore) 기능 활용 - 핵심'),
      p('일반 대시보드보다 "탐색"이 훨씬 강력합니다. 추천 템플릿:'),
      spacer(),
      h3('① 유입경로 탐색 (Funnel)'),
      kv('경로', '이벤트 페이지 진입 → 등록 시작 → 등록 완료'),
      kv('효과', '각 단계 이탈률 시각화'),
      h3('② 경로 탐색 (Path)'),
      kv('용도', '사용자가 "/"에서 어디로 이동하는지 트리 형태로 확인'),
      h3('③ 세그먼트 비교'),
      kv('예시', '모바일 vs 데스크톱 전환율, 신규 vs 재방문 등'),
      spacer(),

      // 5. 맞춤 보고서
      h1('5. 맞춤 보고서 만들기'),
      p('관리 > 맞춤 정의 > 맞춤 측정기준에서 다음 항목을 추가하면 이벤트별 분석이 가능합니다.'),
      spacer(),
      makeTable(
        ['측정기준명', '이벤트 파라미터', '활용'],
        [
          ['이벤트명', 'event_name_label', '어떤 이벤트가 인기 있는지'],
          ['이벤트 카테고리', 'event_category', '스프린트/세미나/워크샵별 분석'],
          ['신청 경로', 'referral_source', '지인 추천/광고 등 경로 효과'],
        ]
      ),
      spacer(),
      p('예: "세미나 이벤트의 전환율은?", "지인 추천 경로의 비율은?" 같은 질문에 바로 답할 수 있습니다.', { color: GRAY }),
      spacer(),

      // 6. 알림 자동화
      h1('6. 알림 자동화 (Intelligence)'),
      p('관리 > 맞춤 알림에서 설정:'),
      bullet('하루 등록 수가 평소보다 50% 감소하면 이메일 발송'),
      bullet('특정 지역 트래픽 급증 시 알림'),
      bullet('전환율이 임계값 이하로 떨어지면 알림'),
      p('매일 대시보드를 확인하지 않아도 이상 징후가 자동으로 감지됩니다.', { color: GRAY }),
      spacer(),

      // 7. Looker Studio
      h1('7. Looker Studio 연동 (시각화)'),
      p('GA4 대시보드는 복잡합니다. Looker Studio(lookerstudio.google.com)에 연동하면:'),
      bullet('한 화면에 KPI 요약 (이번 주 등록수, 전환율, 인기 이벤트 Top 3)'),
      bullet('PDF 보고서 자동 발송'),
      bullet('임원 공유용 대시보드 제작'),
      spacer(),

      // 추천 우선순위
      h1('추천 우선순위'),
      makeTable(
        ['우선순위', '기간', '작업'],
        [
          ['🔴 긴급', '이번 주', '내부 IP 제외 + 데이터 보존 14개월 + Google Signals 켜기'],
          ['🟡 중요', '이번 달', '맞춤 측정기준 등록 (event_name_label, event_category, referral_source)'],
          ['🟢 장기', '분기별', 'Looker Studio 대시보드 구성 + 맞춤 알림 설정'],
        ]
      ),
      spacer(),

      // 현재 구현된 이벤트 요약
      h1('부록: 현재 구현된 이벤트 플로우'),
      p('Cloocus Event System에 적용된 사용자 여정 트래킹:'),
      spacer(),
      p('[1단계] event_view     → 사용자가 이벤트 카드를 클릭함', { bold: true }),
      p('[2단계] form_start     → 등록 폼에 진입함', { bold: true }),
      p('[3단계] form_submit    → 등록을 완료함 (핵심 전환 지점)', { bold: true }),
      p('[4단계] portal_login   → 신청자 포털에 로그인함', { bold: true }),
      p('[5단계] survey_complete → 설문조사를 완료함', { bold: true }),
      p('[6단계] certificate_download → 수료증을 다운로드함 (최종 여정)', { bold: true }),
      spacer(),
      p('위 6단계 깔때기를 Explore > Funnel 보고서로 만들면 각 단계 이탈률을 한눈에 볼 수 있습니다.', { color: GRAY }),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: '© 2026 Cloocus Event System', size: 18, color: GRAY })],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('/home/iseul/cloocus-event/docs/GA4_활용_가이드.docx', buffer);
console.log('✅ GA4_활용_가이드.docx 생성 완료');
