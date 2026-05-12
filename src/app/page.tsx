'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackEventView } from '@/lib/analytics';
import { captureAttribution } from '@/lib/utm';
import { trackView, trackClick } from '@/lib/tracker';
import type { Event } from '@/lib/types';
import {
  SocialProofBadge, DDayChip, TopLiveCounter, useEngagement,
  type Tone, type EngagementData,
} from '@/components/SocialProof';

// ============================================================
// 홈 이벤트 카드 (Premium AI Experience)
// ============================================================
type CategoryKey = '세미나' | '프로모션' | '워크샵' | '스프린트' | 'default';

const CATEGORY_TINTS: Record<CategoryKey, { fg: string; bg: string; line: string; glow: string }> = {
  세미나:   { fg: '#7c3aed', bg: 'rgba(167, 139, 250, 0.1)', line: 'rgba(139, 92, 246, 0.4)',  glow: 'rgba(139, 92, 246, 0.18)' },
  프로모션: { fg: '#059669', bg: 'rgba(52, 211, 153, 0.1)',  line: 'rgba(16, 185, 129, 0.45)', glow: 'rgba(16, 185, 129, 0.18)' },
  워크샵:   { fg: '#0891b2', bg: 'rgba(34, 211, 238, 0.1)',  line: 'rgba(6, 182, 212, 0.45)',  glow: 'rgba(6, 182, 212, 0.18)' },
  스프린트: { fg: '#ea580c', bg: 'rgba(251, 146, 60, 0.1)',  line: 'rgba(249, 115, 22, 0.45)', glow: 'rgba(249, 115, 22, 0.18)' },
  default:  { fg: '#3b82f6', bg: 'rgba(96, 165, 250, 0.1)',  line: 'rgba(59, 130, 246, 0.45)', glow: 'rgba(59, 130, 246, 0.18)' },
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}(${DOW[d.getDay()]})`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}(${DOW[d.getDay()]})`;
}

function formatEventDate(event: Event): string {
  if (event.category === '프로모션') {
    return `${formatFullDate(event.event_date)}까지`;
  }
  if (event.event_date_end && event.event_date_end !== event.event_date) {
    return `${formatShortDate(event.event_date)}-${formatShortDate(event.event_date_end)}`;
  }
  return formatFullDate(event.event_date);
}

function CategoryIcon({ category }: { category: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (category === '세미나') {
    return (
      <svg {...common}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    );
  }
  if (category === '프로모션') {
    return (
      <svg {...common}>
        <path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.5L12 14.6 6 17.2l1-5.5-4-3.9 5.5-.8z" />
      </svg>
    );
  }
  if (category === '워크샵') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (category === '스프린트') {
    return (
      <svg {...common}>
        <polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function NeuralFlow() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <path d="M0 22 Q 16 14, 32 22 T 64 22" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <path d="M0 32 Q 20 38, 32 32 T 64 32" stroke="var(--tint-line)" strokeOpacity="0.45" strokeWidth="0.7" fill="none" />
      <path d="M0 42 Q 18 50, 32 42 T 64 42" stroke="var(--tint-line)" strokeOpacity="0.28" strokeWidth="0.7" fill="none" />
      <circle r="1.6" cx="0" cy="32" className="nf-pulse">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M0 0 Q 20 6, 32 0 T 64 0" />
      </circle>
      <circle r="1.2" cx="0" cy="22" className="nf-pulse">
        <animateMotion dur="5.5s" repeatCount="indefinite" begin="-1.5s" path="M0 0 Q 16 -8, 32 0 T 64 0" />
      </circle>
    </svg>
  );
}

function PremiumEventCard({ event, isSelected, onSelect, engagement }: {
  event: Event;
  isSelected: boolean;
  onSelect: () => void;
  engagement?: EngagementData;
}) {
  const isEnded = event.status === 'ended';
  const isClosed = event.status === 'closed';
  const tint = CATEGORY_TINTS[(event.category as CategoryKey)] || CATEGORY_TINTS.default;

  // 소셜 프루프 톤 (engagement 응답에서 매칭)
  const eventEng = engagement?.events.find((e) => e.event_id === event.id);
  const tone: Tone | null = engagement?.settings.enabled && !isEnded && !isClosed ? (eventEng?.tone ?? null) : null;

  // D-day 칩 노출 여부 (프로모션 카테고리는 표시 안 함 — event_date 가 마감 기한)
  const showDDay =
    engagement?.settings.dday_chip_enabled !== false &&
    !isEnded && !isClosed &&
    event.category !== '프로모션' &&
    !!event.event_date;

  return (
    <button
      type="button"
      disabled={isEnded}
      onClick={onSelect}
      className={`premium-card group relative w-full text-left ${isSelected ? 'is-selected' : ''} ${isEnded ? 'is-ended' : ''}`}
      style={{
        '--tint-fg': tint.fg,
        '--tint-bg': tint.bg,
        '--tint-line': tint.line,
        '--tint-glow': tint.glow,
      } as React.CSSProperties}
    >
      <span className="premium-card-border" aria-hidden="true" />

      <div className="relative z-[2] flex items-stretch gap-3 sm:gap-3.5 px-3 sm:px-4 py-3.5 sm:py-4">
        {/* 좌측 아이콘 */}
        <div className="shrink-0 flex items-start pt-0.5">
          <div className="premium-icon">
            <CategoryIcon category={event.category} />
          </div>
        </div>

        {/* 중앙 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {event.category && <span className="premium-category">{event.category}</span>}
            {isEnded && <span className="premium-status-end">종료</span>}
            {isClosed && <span className="premium-status-closed">마감</span>}
            {tone && (
              <SocialProofBadge
                tone={tone}
                label={engagement?.settings.labels?.[tone]}
                count={eventEng?.count}
                emojiPos={engagement?.settings.emoji_position ?? 'end'}
              />
            )}
          </div>
          <h3 className="premium-title">{event.name}</h3>
          {event.summary && <p className="premium-summary">{event.summary}</p>}
          <div className="premium-meta">
            <span className="premium-meta-item">
              <CalendarIcon />
              <span>{formatEventDate(event)}</span>
            </span>
            {event.event_type && event.event_type !== 'none' && (
              <>
                <span className="premium-meta-dot">·</span>
                <span>{event.event_type === 'online' ? 'Online' : 'Offline'}</span>
              </>
            )}
            {event.capacity && (
              <>
                <span className="premium-meta-dot">·</span>
                <span>정원 {event.capacity}명</span>
              </>
            )}
            {showDDay && (
              <>
                <span className="premium-meta-dot">·</span>
                <DDayChip eventDate={event.event_date} />
              </>
            )}
          </div>
        </div>

        {/* 우측 ambient (Neural Flow) — 카드를 살아있는 AI capability 처럼 표현 */}
        <div className="shrink-0 self-center">
          <div className="premium-ambient" aria-hidden="true">
            <NeuralFlow />
          </div>
        </div>
      </div>
    </button>
  );
}

function BrandFooter() {
  return (
    <footer className="py-4 sm:py-5 px-4 border-t border-gray-200" style={{ backgroundColor: '#eef0f4' }}>
      <div className="max-w-lg mx-auto text-center">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cloocus-logo.png" alt="Cloocus" className="h-4 sm:h-5" />
          <span className="text-gray-300">|</span>
          <span className="text-xs sm:text-sm text-gray-600 font-medium">(주)클루커스</span>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
          📍본사ㅣ서울특별시 강남구 논현로75길 6 (역삼동, 에비뉴75)<br className="sm:hidden" /><span className="hidden sm:inline"> | </span>📞02-597-3400
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
          ✉️ marketing@cloocus.com
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  // 실시간 활성도 (소셜 프루프) — 20s polling, 탭 활성 시 즉시 갱신
  const engagement = useEngagement();
  const showTopLive =
    engagement.settings.enabled &&
    engagement.settings.top_live_counter_enabled &&
    engagement.page.active_viewers >= engagement.settings.top_live_counter_min;

  // 마감 이벤트 팝업
  const [closedEventPopup, setClosedEventPopup] = useState<Event | null>(null);
  const [closedAcknowledged, setClosedAcknowledged] = useState(false);

  // UTM / referrer 캡처 + page_view
  useEffect(() => {
    captureAttribution();
    trackView('/');
  }, []);

  // 이벤트 목록 로드
  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []);

  // 관리자 미리보기 호환: ?preview_event=<id> 가 있으면 해당 이벤트의 slug 페이지로 리다이렉트
  useEffect(() => {
    if (events.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const previewId = params.get('preview_event');
    if (previewId) {
      const evt = events.find((e) => e.id === previewId);
      if (evt?.slug) {
        router.replace(`/${evt.slug}`);
      }
    }
  }, [events, router]);

  const goToEvent = (event: Event) => {
    if (event.status === 'ended') return;
    if (!event.slug) {
      // slug 가 없는(레거시) 이벤트 — 안전장치
      return;
    }
    trackClick('event-select', { event_id: event.id });
    trackEventView(event.name, event.category);
    router.push(`/${event.slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-6 mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트</h1>
            <p className="text-gray-500 text-center mb-5">참여하실 이벤트를 선택해주세요.</p>

            {showTopLive && (
              <div className="flex justify-center mb-5">
                <TopLiveCounter
                  count={engagement.page.active_viewers}
                  min={engagement.settings.top_live_counter_min}
                />
              </div>
            )}

            {eventsLoading ? (
              <p className="text-center text-gray-400 py-8">로딩 중...</p>
            ) : events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">현재 등록 가능한 이벤트가 없습니다.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {events.map((event) => (
                    <PremiumEventCard
                      key={event.id}
                      event={event}
                      isSelected={selectedEvent?.id === event.id}
                      engagement={engagement}
                      onSelect={() => {
                        if (event.status === 'ended') return;
                        if (event.status === 'closed') {
                          setClosedEventPopup(event);
                          return;
                        }
                        setSelectedEvent(event);
                      }}
                    />
                  ))}
                </div>

                {events.every((e) => e.status === 'closed' || e.status === 'ended') && (
                  <p className="text-center text-gray-400 text-sm mt-4">현재 모든 이벤트의 신청이 마감되었습니다.</p>
                )}
              </>
            )}

            {closedEventPopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-500 text-xl">⚠</span>
                    <h3 className="text-lg font-bold text-gray-900">마감 안내</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">현재 정원이 마감되어 등록이 어려울 수 있습니다.</p>
                  <label className="flex items-start gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={closedAcknowledged}
                      onChange={(e) => setClosedAcknowledged(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">위 내용을 확인했습니다.</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      disabled={!closedAcknowledged}
                      onClick={() => {
                        const evt = closedEventPopup;
                        setClosedEventPopup(null);
                        setClosedAcknowledged(false);
                        if (evt) goToEvent(evt);
                      }}
                      className="btn-primary flex-1 disabled:opacity-40"
                    >
                      등록 진행하기
                    </button>
                    <button
                      onClick={() => { setClosedEventPopup(null); setClosedAcknowledged(false); }}
                      className="btn-secondary flex-1"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => { if (selectedEvent) goToEvent(selectedEvent); }}
              disabled={!selectedEvent || selectedEvent.status === 'ended'}
              className="register-btn w-full mt-6"
            >
              <span>이벤트 등록하기</span>
              <span className="register-btn-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
            <a
              href="/my"
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 hover:underline block text-center"
            >
              등록 정보 조회ㅣ신청자 포털
            </a>
          </div>
        </div>
      </div>
      <BrandFooter />
    </div>
  );
}
