# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## 응답 언어 · 스타일 정책

- **기본 응답 언어는 한국어.** 자연스럽고 전문적인 톤을 유지하되 너무 딱딱하지 않게.
- B2B 마케팅 / SaaS / IT 실무 용어 우선. `Dashboard`, `Funnel`, `Segment`, `CRM`, `GA4`, `Admin Portal` 등은 영문 그대로 혼용.
- 길게 늘이지 말 것. 표·리스트·단계 구조로 바로 실무 적용 가능한 수준으로.
- UX writing이 닿는 부분(버튼 라벨, 안내문, 빈 상태 텍스트 등)은 모던하고 간결한 한국어로 작성.
- 기술 변경 제안 시 항상 다음을 함께 고려해 답할 것: ① 사용자 편의 ② 마케팅 운영 효율 ③ 자동화 여지 ④ 데이터 수집/분석 가치 ⑤ 확장성/유지보수성.

---

## 프로젝트 정체성

`cloocus-event-2026` — 클루커스(Cloocus) 마케팅팀의 사내 **이벤트 운영 자동화 플랫폼**.

- 회사: Cloocus(한국 MSP, Cloud / Data·AI / Security / Managed Services, 주 고객은 B2B 엔터프라이즈).
- 두 개의 포털을 하나의 Next.js 앱으로 운영:
  - **신청자 포털** (`/`, `/[slug]`, `/my`, `/verify/[id]`) — 이벤트 탐색·신청·설문·증명서 발급까지 self-service.
  - **운영자 포털** (`/admin-cloocus-mkt/*`) — 이벤트/등록/승인/대기/설문/메일/증명서/대시보드/감사로그.
- 이 플랫폼은 **이벤트 관리 + 고객 데이터 플랫폼 + 마케팅 운영 허브 + 분석 기반**의 4역할을 동시에 한다. 단순 등록 폼이 아님을 항상 의식할 것.
- 모든 기능 제안은 *마케터 운영 효율*과 *신청자 self-service 경험*의 균형을 고려한다.

---

## 명령어

이 저장소는 표준 Next.js 스크립트만 갖고 있다 (`package.json`).

```bash
npm run dev    # 개발 서버 (기본 http://localhost:3000)
npm run build  # 프로덕션 빌드
npm run start  # 빌드 결과 실행
```

별도의 lint / test 스크립트는 정의되어 있지 않다 — 새로 추가하지 말고, 정적 검증이 필요하면 `npx tsc --noEmit` 으로 타입체크.

> **시안/미리보기는 항상 로컬 dev에서 먼저 확인한 뒤 커밋·배포한다.** (사용자가 명시한 작업 규칙)

---

## 핵심 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js **16.2.3** (App Router, RSC) — 학습 데이터의 Next.js와 다르므로 작업 전 `node_modules/next/dist/docs/` 의 가이드를 참조 |
| UI | React 19, Tailwind v4 (`@tailwindcss/postcss`), Geist + Noto Sans KR |
| 백엔드 | Supabase (Postgres + Auth) |
| 차트 | recharts |
| 문서/리포팅 | xlsx, jspdf, pptxgenjs, html2canvas |
| 메일 | Resend API |
| 분석 | GA4 (`<GoogleAnalytics>` 클라이언트 컴포넌트, 내부 IP에는 자동 suppress) |
| 언어 | TypeScript strict, path alias `@/* → src/*` |

배포는 Vercel (`NEXT_PUBLIC_SITE_URL` 기본값 `https://cloocus-event-2026.vercel.app`).

---

## 디렉토리 한눈에

```
src/
  app/
    layout.tsx                    # 폰트 + GA + PortalMeshBackground + 내부IP 헤더 분기
    page.tsx                      # 홈: 이벤트 리스트 (소셜 프루프/엔게이지먼트 카드)
    [slug]/page.tsx               # 이벤트 랜딩 + 등록 폼 (slug = baseSlugFromDate 기반 YYYYMMDD)
    my/page.tsx                   # 신청자 포털 (등록 조회·설문·증명서)
    verify/[id]/...               # 증명서 검증 페이지
    admin-cloocus-mkt/            # 운영자 포털 (events / registrations / surveys / faqs / emails /
                                  #  promotions / certificates / inquiries / users / sidebar-settings /
                                  #  feature-flags / trash / form / survey-list / survey-responses ...)
    api/
      events/, register/, survey/, track/, verify/, engagement/,
      certificate/, form-options/, faqs/, inquiry-comments/,
      privacy-policy/, survey-questions/
      admin/
        dashboard/, events/, registrations/, users/, email/, email-logs/,
        survey-list/, survey-questions/, survey-responses/, survey-stats/,
        faqs/, faq-categories/, inquiries/, settings/, companies/,
        certificate-stats/, event-questions/, export/, form-options/,
        privacy-policies/, promotions-export/, test-notify/
  components/
    GoogleAnalytics.tsx, PortalMeshBackground.tsx, SocialProof.tsx
    admin/ (AdminSidebar 등)
  lib/
    supabase.ts            # 공개 익명 클라이언트 (getSupabase)
    supabase-auth.ts       # 서비스 롤 클라이언트 + getAdminFromToken / canEdit / canDelete
    internal-ip.ts         # 내부 IP/CIDR 필터 (트래킹·GA·통계 제외)
    notifications.ts       # Resend 기반 운영자 알림(등록/설문)
    tracker.ts             # 클라이언트 view/click → /api/track
    utm.ts                 # 어트리뷰션 캡처/리드
    analytics.ts           # GA4 이벤트 헬퍼
    survey-questions.ts    # 동적 설문 로더 (event_id → null → DEFAULT fallback)
    custom-answers.ts      # 등록 폼 커스텀 문항 검증
    company-normalize.ts   # 회사명 정규화 + dart-companies.json 매칭
    industry-groups.ts, slug.ts, date.ts, validation.ts, constants.ts, types.ts
  data/dart-companies.json
scripts/                  # DART 회사 시드 SQL, GA 가이드 생성기 등 운영 보조
supabase-setup.sql        # 최초 스키마
supabase-migrate-v2.sql … supabase-migrate-vN.sql   # 누적 마이그레이션 (단방향, 위→아래 적용)
```

---

## 아키텍처 / 핵심 컨벤션 (반드시 숙지)

### 1. Supabase 클라이언트는 두 종류

- `getSupabase()` (`lib/supabase.ts`) — 공개 anon 키. 클라이언트 컴포넌트에서 사용.
- `getServiceSupabase()` (`lib/supabase-auth.ts`, 일부 라우트는 로컬 동일 함수) — **service role key**. `src/app/api/**` 의 서버 라우트 / admin 작업 전용.
- 새 라우트를 만들 때 "어느 쪽 권한이 적절한가"를 먼저 결정하라. 신청자가 호출하는 엔드포인트에 service role을 쓰면 RLS 우회가 노출된다.

### 2. 운영자 인증

- 운영자 화면은 모두 `/admin-cloocus-mkt/*`, API는 `/api/admin/*`.
- 인증 토큰은 `Authorization: Bearer <supabase access token>` 헤더로 전달 → `getAdminFromToken(req.headers.get('authorization'))` 가 `admin_users` 테이블에서 권한 행을 조회.
- 권한 가드는 `canEdit(role)` / `canDelete(role)` 사용 (`admin` / `editor` / `viewer`).
- 어떤 작업이 누구의 권한으로 일어났는지 추적하기 위해 `audit_entries` 류 테이블이 존재 — 운영자 변경/삭제는 감사로그가 함께 남도록 패턴을 따른다 (`types.ts: AuditEntry`).

### 3. 내부 IP 필터 — 데이터 정확도의 핵

`lib/internal-ip.ts` 는 단순 차단이 아니라 **마케팅 데이터 품질 장치**다.

- 하드코딩된 IP/CIDR + `INTERNAL_IPS` 환경변수를 합쳐 매칭.
- `app/layout.tsx` 가 SSR 단계에서 `isInternalRequest(headers)` 로 판정 → `window.__INTERNAL_TRAFFIC__ = true` 주입 → 1) GA4 suppress 2) `tracker.ts` 가 `/api/track` 호출 차단.
- `/api/track` 자체도 서버에서 다시 한 번 내부 IP를 거른다.
- 신청 등록(`/api/register`)은 차단하지 않고 **`is_internal=true` 플래그만 기록** → 대시보드 집계 쿼리가 이 플래그로 통계에서 제외 (`supabase-migrate-v37.sql`). 알림 메일도 내부 등록이면 발송 생략.
- 새 분석/리포팅 쿼리를 짤 때 **항상 `is_internal=false` 또는 `IS NOT TRUE` 조건을 디폴트로 두라.**

### 4. 트래킹 / 어트리뷰션 데이터 흐름

```
사용자 ───▶ utm.ts (captureAttribution)        ─┐
        ▶ tracker.ts (trackView / trackClick)  ─┼─▶ /api/track ─▶ page_events
        ▶ analytics.ts (GA4)                   ─┘
사용자 ───▶ /api/register (등록)
            └ 등록 row 안에 utm_* / landing_page / referrer_url / user_id 동봉
```

- `user_id` = localStorage 영구 익명 ID, `session_id` = sessionStorage 탭 수명.
- 등록 row와 `page_events` row 는 동일 `user_id` 로 조인 가능 — 퍼널/드롭오프/체류 분석의 기반.
- 새 페이지/주요 CTA 를 추가할 때 `trackView(path)` / `trackClick(elementId, { event_id })` 호출을 반드시 함께 넣는다. 그렇지 않으면 대시보드 funnel에서 누락된다.

### 5. 이벤트 슬러그 규칙

- `lib/slug.ts` 의 `baseSlugFromDate(event_date)` → `YYYYMMDD`. 같은 날짜 충돌은 `-2`, `-3` … suffix.
- `/[slug]/page.tsx` 가 신청자 진입 경로. 홈에서 `?preview_event=<id>` 가 있으면 해당 slug 로 리다이렉트(운영자 미리보기 호환).
- slug 가 없는 레거시 이벤트는 홈 카드 클릭이 무시되도록 안전장치가 있음. 새 이벤트는 반드시 slug 가 생성되어야 함.

### 6. 동적 설문 (event_id 기준)

`lib/survey-questions.ts` 의 우선순위를 그대로 따른다:

1. `survey_questions WHERE event_id = X AND active = true`
2. `survey_questions WHERE event_id IS NULL AND active = true`  (기본 설문)
3. `DEFAULT_SURVEY_QUESTIONS` (코드 fallback — DB가 빈 경우의 안전망)

신청자 포털(`/my`)의 설문 폼은 이 로더 결과로 **완전 동적**으로 렌더된다. 즉 운영자 포털 "설문 폼" 페이지에서의 편집이 즉시 신청자 측에 반영된다. 새 설문 관련 기능을 추가할 때 코드에 문항을 박지 말고 이 로더를 통과시킬 것.

### 7. SQL 마이그레이션은 누적 파일

- `supabase-setup.sql` (초기) → `supabase-migrate-v2.sql … supabase-migrate-v{N}.sql`. 새 마이그레이션은 **항상 다음 번호의 새 파일로** 추가하고, 기존 파일을 수정하지 않는다.
- 각 파일 상단에 *왜* 이 마이그레이션이 필요한지 한국어 주석으로 짧게 남기는 컨벤션(예: v37). 새 파일도 동일 패턴 유지.
- `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 식으로 멱등성을 확보하는 패턴이 많다 — 운영 DB에 두 번 적용되어도 안전하게 작성할 것.

### 8. 운영자 알림 (Resend)

- `lib/notifications.ts` 의 `notifyAdminRegistrationComplete` / `notifyAdminSurveyComplete` 두 함수가 운영자 메일을 일괄 책임진다.
- 환경변수 `RESEND_API_KEY` / `ADMIN_NOTIFY_EMAIL` / `RESEND_FROM` / `NEXT_PUBLIC_SITE_URL`.
- 키 미설정이면 조용히 스킵(개발 환경 보호). 새 알림 종류를 추가할 때 동일한 표 기반 HTML 템플릿/`formatKstNow` 패턴을 따른다.

### 9. 회사명·산업군 정규화

- 신청 시 사용자 입력 `company_name` 은 `company-normalize.ts` 가 한 번 정규화(`company_name`)하고, 원문은 `company_name_raw` 로 같이 보관.
- 자동완성/그루핑은 `src/data/dart-companies.json` + Supabase `companies` 테이블 시드(`scripts/seed-companies*.sql`)를 활용.
- 산업군은 `lib/industry-groups.ts` 의 그룹 정의를 *공통 그라운드*로 쓴다 — 대시보드와 폼이 같은 그룹 키를 공유해야 한다.

### 10. UX/UI 톤

- 메인 색감: 보라 계열(`#4c2d96`, `#6d28d9`) + 카테고리별 틴트(세미나/프로모션/워크샵/스프린트).
- 카드형, 라운드 12px, 톤다운된 글로우/그라데이션, 한국어 1줄 카피.
- 빈 상태/마감 상태/내부 미리보기 안내는 신청자가 막다른 길에 갇히지 않도록 항상 다음 행동(돌아가기/다른 이벤트 보기)을 제공.
- "마감된 이벤트 안내는 `/[slug]` 진입 시 팝업이 일괄 담당" — 홈 카드 클릭에서 중복 안내를 만들지 말 것 (커밋 7dd4ad9 참고).

---

## 기능 제안·구현 시 체크리스트

새 기능, 리팩토링, 대시보드/지표 변경을 다룰 때 다음을 무조건 한 번 통과시킨다:

1. **권한 경계** — service role vs anon, admin role(`admin`/`editor`/`viewer`)이 적절한가?
2. **데이터 정확도** — `is_internal`, 내부 IP, 취소(`cancelled_at`), 상태(`registration_status`, `email_status`) 필터를 빠뜨리지 않았는가?
3. **트래킹 hook** — 신규 페이지/CTA에 `trackView` / `trackClick` 가 붙었는가? UTM 캡처가 유실되지 않는가?
4. **자동화 여지** — 운영자가 수동으로 또 처리하게 만드는 지점은 없는가? (메일/상태전환/증명서 등)
5. **마이그레이션** — DB 스키마 변경이라면 새 번호의 `supabase-migrate-vN.sql`로, 멱등성·롤포워드만 고려.
6. **분석 가치** — 추가하는 컬럼/이벤트가 대시보드·세그먼트·퍼널에서 어떻게 쓰일지 한 줄로 답할 수 있는가? 답이 안 나오면 수집 시점이 아니다.
7. **신청자 경험** — 친절한 빈 상태/에러/마감 안내가 있는가? 다음 행동(다른 이벤트, /my 로 가기 등)이 있는가?

---

## 알아두면 좋은 메모

- 홈 카드의 D-day / 실시간 활성도(`useEngagement`)는 20초 폴링 + 탭 활성화 시 즉시 갱신. 너무 자주 호출하는 변경은 피한다.
- 운영자 페이지에서 등록 행을 "삭제" 하는 동작은 실제 DELETE 가 아니라 `trash` 패턴인 경우가 많다 — 새 운영 액션을 만들 때 soft delete 컨벤션을 먼저 확인.
- 신청자 페이지/관리자 페이지 양쪽에서 같은 도메인 모델(`types.ts`)을 공유하므로, 컬럼 추가 시 `types.ts` 갱신을 잊지 말 것.
- `next/font` 로 Geist/Geist Mono, 한국어는 Google Fonts CDN으로 Noto Sans KR. 새 폰트 추가는 자제(렌더 코스트).
