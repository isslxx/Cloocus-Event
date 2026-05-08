'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackEventView } from '@/lib/analytics';
import { captureAttribution } from '@/lib/utm';
import { trackView, trackClick } from '@/lib/tracker';
import type { Event } from '@/lib/types';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cloocus-logo.png" alt="Cloocus" className="h-7 mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-center mb-2">클루커스 이벤트</h1>
            <p className="text-gray-500 text-center mb-8">참여하실 이벤트를 선택해주세요.</p>

            {eventsLoading ? (
              <p className="text-center text-gray-400 py-8">로딩 중...</p>
            ) : events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">현재 등록 가능한 이벤트가 없습니다.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {events.map((event) => {
                    const isEnded = event.status === 'ended';
                    const isClosed = event.status === 'closed';
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          if (isEnded) return;
                          if (isClosed) {
                            setClosedEventPopup(event);
                            return;
                          }
                          setSelectedEvent(event);
                        }}
                        disabled={isEnded}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isEnded
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : selectedEvent?.id === event.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {event.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 shrink-0">
                                {event.category}
                              </span>
                            )}
                            <p className={`font-semibold text-base ${isEnded ? 'text-gray-400' : ''}`}>{event.name}</p>
                          </div>
                          {isEnded && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-600 shrink-0">종료</span>
                          )}
                          {isClosed && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-600 shrink-0">마감</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {event.category === '프로모션' ? (
                            <span className="text-sm text-gray-500">
                              기한: {(() => { const d = new Date(event.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {(() => { const d = new Date(event.event_date); const day = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${day})`; })()}
                            </span>
                          )}
                          {event.event_type && event.event_type !== 'none' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              event.event_type === 'online'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {event.event_type === 'online' ? 'Online' : 'Offline'}
                            </span>
                          )}
                          {event.capacity && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              정원 {event.capacity}명
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
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
              className="btn-primary w-full mt-6"
            >
              등록하기
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
