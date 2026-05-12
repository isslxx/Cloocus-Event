'use client';

/**
 * /admin-cloocus-mkt/feature-flags
 *
 * 실시간 활성도(소셜 프루프) 운영 설정 페이지.
 *
 * 다루는 항목:
 *  - 소셜 프루프 배지 전체 ON/OFF, 이모지 위치, 톤별 문구
 *  - 임계값 (라이브/신청 증가/마감 임박)
 *  - 페이지 상단 라이브 카운터 ON/OFF · 최소 인원
 *  - D-day 칩 ON/OFF
 *
 * 변경 사항은 /api/admin/settings PUT 으로 저장. 즉시 신청자 포털에 반영(20s 폴링).
 */

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../layout';
import { SocialProofBadge, DDayChip, TopLiveCounter } from '@/components/SocialProof';

type Tone = 'urgent' | 'hot' | 'rising' | 'live' | 'popular';

const TONE_META: { key: Tone; title: string; desc: string }[] = [
  { key: 'urgent',  title: '마감 임박', desc: '정원 80%↑ 채워졌고 D-day 임계값 이내' },
  { key: 'hot',     title: '인기 급상승', desc: '최근 신청수가 임계값 × 배수 이상' },
  { key: 'rising',  title: '신청 증가', desc: '최근 신청수가 임계값 이상' },
  { key: 'live',    title: '동시 접속', desc: '현재 동시 viewer가 임계값 이상' },
  { key: 'popular', title: '조회 인기', desc: '같은 페이지 내 최근 1시간 조회 1위' },
];

type Settings = {
  social_proof_enabled: boolean;
  social_proof_emoji_position: 'none' | 'end';
  social_proof_labels: Record<Tone, string>;
  social_proof_thresholds: {
    live_min: number;
    rising_recent_min: number;
    rising_window_minutes: number;
    hot_multiplier: number;
    urgent_dday_within: number;
    urgent_capacity_pct: number;
  };
  top_live_counter_enabled: boolean;
  top_live_counter_min: number;
  dday_chip_enabled: boolean;
  _migrated?: boolean;
};

export default function FeatureFlagsPage() {
  const { user: admin, accessToken } = useAdmin();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [original, setOriginal] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrated, setMigrated] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 편집 모드 — 기본 read-only, "수정" 버튼으로 활성화
  const [editing, setEditing] = useState(false);
  const [savedModal, setSavedModal] = useState(false);

  const isEditable = admin?.role !== 'viewer';

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setMigrated(data._migrated !== false);
      setSettings(data);
      setOriginal(data); // 취소 시 복원용 스냅샷
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    if (!isEditable || !settings) return;
    setOriginal(settings); // 현재 상태를 스냅샷
    setEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    if (!original) return;
    setSettings(original); // 스냅샷으로 복원
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!settings || !isEditable) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          social_proof_enabled: settings.social_proof_enabled,
          social_proof_emoji_position: settings.social_proof_emoji_position,
          social_proof_labels: settings.social_proof_labels,
          social_proof_thresholds: settings.social_proof_thresholds,
          top_live_counter_enabled: settings.top_live_counter_enabled,
          top_live_counter_min: settings.top_live_counter_min,
          dday_chip_enabled: settings.dday_chip_enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '저장 실패');
      } else {
        const next = { ...settings, ...data, _migrated: true };
        setSettings(next);
        setOriginal(next);
        setEditing(false);
        setSavedModal(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-400">로딩 중...</p>;
  }

  if (!settings) {
    return <p className="text-gray-400">설정을 불러오지 못했습니다.</p>;
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const updateLabel = (tone: Tone, value: string) => {
    setSettings({
      ...settings,
      social_proof_labels: { ...settings.social_proof_labels, [tone]: value },
    });
  };

  const updateThreshold = <K extends keyof Settings['social_proof_thresholds']>(
    key: K, value: number
  ) => {
    setSettings({
      ...settings,
      social_proof_thresholds: { ...settings.social_proof_thresholds, [key]: value },
    });
  };

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">실시간 활성도 (소셜 프루프)</h1>
        <p className="text-sm text-gray-500 mt-1">
          신청자 포털 첫 화면의 실시간 배지 · D-day 칩 · 상단 라이브 카운터 설정. 저장 즉시 약 20초 내 사용자 화면에 반영됩니다.
        </p>
      </header>

      {!migrated && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠ 마이그레이션 필요</p>
          <p className="text-xs text-amber-700">
            <code className="px-1 py-0.5 bg-white border border-amber-200 rounded">supabase-migrate-v36.sql</code> 을 Supabase Studio에서 실행해주세요. 이전까지는 기본값으로 동작합니다.
          </p>
        </div>
      )}

      {/* 미리보기 — 폼 입력값 실시간 반영 */}
      <PreviewSection settings={settings} editing={editing} />

      {/* 전체 ON/OFF */}
      <Section title="기본 설정">
        <Toggle
          label="실시간 활성도 배지 사용"
          desc="OFF 시 카테고리 옆 모든 톤별 배지가 사라집니다."
          checked={settings.social_proof_enabled}
          onChange={(v) => update('social_proof_enabled', v)}
          disabled={!isEditable || !editing}
        />
        <Field label="이모지 위치" desc="배지 텍스트 끝에 표시할지, 표시하지 않을지">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
            value={settings.social_proof_emoji_position}
            onChange={(e) => update('social_proof_emoji_position', e.target.value as 'none' | 'end')}
            disabled={!isEditable || !editing}
          >
            <option value="end">글자 끝</option>
            <option value="none">표시 안 함</option>
          </select>
        </Field>
      </Section>

      {/* 톤별 문구 */}
      <Section title="톤별 문구">
        <p className="text-xs text-gray-500 mb-3 -mt-1">
          5종의 신호 메시지. 실시간 카운트가 들어가는 톤(동시 접속·신청 증가)은 숫자가 자동으로 합쳐집니다.
        </p>
        {TONE_META.map(({ key, title, desc }) => (
          <Field key={key} label={title} desc={desc}>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
              value={settings.social_proof_labels[key] ?? ''}
              onChange={(e) => updateLabel(key, e.target.value)}
              disabled={!isEditable || !editing}
            />
          </Field>
        ))}
      </Section>

      {/* 임계값 */}
      <Section title="임계값 (Threshold)">
        <p className="text-xs text-gray-500 mb-3 -mt-1">
          신호가 켜지는 기준값. 너무 낮으면 자주 켜져 의미가 흐려지고, 너무 높으면 영영 켜지지 않습니다.
        </p>
        <NumberField
          label="동시 접속 최소 인원 (live)"
          desc="이 인원 이상일 때 '동시 접속 중' 배지 표시"
          value={settings.social_proof_thresholds.live_min}
          min={1} max={1000}
          onChange={(v) => updateThreshold('live_min', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="신청 증가 임계값 (rising)"
          desc="최근 N분 신청 수가 이 값 이상이면 '신청 증가' 배지"
          value={settings.social_proof_thresholds.rising_recent_min}
          min={1} max={1000}
          onChange={(v) => updateThreshold('rising_recent_min', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="신청 증가 윈도우 (분)"
          desc="최근 N분 신청 수를 집계할 시간 창"
          value={settings.social_proof_thresholds.rising_window_minutes}
          min={1} max={120}
          onChange={(v) => updateThreshold('rising_window_minutes', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="인기 급상승 배수 (hot)"
          desc="신청 증가 임계값 × 이 배수 이상이면 '인기 급상승'"
          step={0.5} min={1} max={10}
          value={settings.social_proof_thresholds.hot_multiplier}
          onChange={(v) => updateThreshold('hot_multiplier', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="마감 임박 D-day 기준 (urgent)"
          desc="이벤트까지 N일 이내일 때 마감 임박 후보"
          value={settings.social_proof_thresholds.urgent_dday_within}
          min={0} max={30}
          onChange={(v) => updateThreshold('urgent_dday_within', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="마감 임박 정원 비율 (urgent)"
          desc="정원 대비 이 비율 이상 채워졌고 D-day 이내일 때만 '마감 임박' (0.0–1.0)"
          step={0.05} min={0} max={1}
          value={settings.social_proof_thresholds.urgent_capacity_pct}
          onChange={(v) => updateThreshold('urgent_capacity_pct', v)}
          disabled={!isEditable || !editing}
        />
      </Section>

      {/* 상단 라이브 카운터 */}
      <Section title="페이지 상단 라이브 카운터">
        <Toggle
          label="상단 라이브 카운터 사용"
          desc="페이지 헤더 영역의 '지금 N명이 둘러보는 중' 표시"
          checked={settings.top_live_counter_enabled}
          onChange={(v) => update('top_live_counter_enabled', v)}
          disabled={!isEditable || !editing}
        />
        <NumberField
          label="최소 노출 인원"
          desc="이 인원 미만이면 카운터를 숨깁니다 (낮은 숫자는 어색해 보임)"
          value={settings.top_live_counter_min}
          min={1} max={1000}
          onChange={(v) => update('top_live_counter_min', v)}
          disabled={!isEditable || !editing}
        />
      </Section>

      {/* D-day 칩 */}
      <Section title="D-day 카운트다운 칩">
        <Toggle
          label="D-day 칩 사용"
          desc="메타 행 끝에 D-7, D-2, '오늘 마감' 등 표시. 프로모션 카테고리는 자동 제외."
          checked={settings.dday_chip_enabled}
          onChange={(v) => update('dday_chip_enabled', v)}
          disabled={!isEditable || !editing}
        />
      </Section>

      {/* 액션 바 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-gray-500">
          {editing ? (
            <span className="text-amber-700">✎ 편집 모드 — 변경 후 저장하거나 취소하세요.</span>
          ) : (
            <span>읽기 전용 — 변경하려면 <b>수정</b> 버튼을 누르세요.</span>
          )}
          {error && <span className="text-rose-600 ml-2">{error}</span>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              disabled={!isEditable || !migrated}
              className="btn-primary"
            >
              수정
            </button>
          )}
        </div>
      </div>

      {/* 저장 완료 모달 */}
      {savedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSavedModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 id="saved-modal-title" className="text-lg font-bold text-gray-900 mb-1">저장 완료</h3>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              설정이 저장되었습니다.<br />
              약 20초 내 신청자 포털에 반영됩니다.
            </p>
            <button
              onClick={() => setSavedModal(false)}
              className="btn-primary w-full"
              autoFocus
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 보조 UI
// ============================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-0.5">{label}</label>
      {desc && <p className="text-xs text-gray-500 mb-1.5">{desc}</p>}
      {children}
    </div>
  );
}

function Toggle({
  label, desc, checked, onChange, disabled,
}: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          } mt-0.5`}
        />
      </button>
    </div>
  );
}

// ============================================================
// 미리보기 — 폼 입력값을 실시간으로 보여주는 섹션
// ============================================================
function dateFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function PreviewSection({ settings, editing }: { settings: Settings; editing: boolean }) {
  const labels = settings.social_proof_labels;
  const emojiPos = settings.social_proof_emoji_position;

  const ALL_TONES: Array<{ key: 'urgent' | 'hot' | 'rising' | 'live' | 'popular'; count?: number }> = [
    { key: 'urgent' },
    { key: 'hot',    count: 12 },
    { key: 'rising', count: 6 },
    { key: 'live',   count: 14 },
    { key: 'popular' },
  ];

  const DDAY_SAMPLES = [
    { label: '오늘', days: 0 },
    { label: 'D-2', days: 2 },
    { label: 'D-5', days: 5 },
    { label: 'D-14', days: 14 },
    { label: 'D-30', days: 30 },
  ];

  const sampleLiveCount = Math.max(settings.top_live_counter_min, 28);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50/70 to-white p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          미리보기
          {editing && (
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              편집 중
            </span>
          )}
        </h2>
        <p className="text-[11px] text-gray-500">변경 사항이 실시간 반영됩니다 (저장 전)</p>
      </div>

      {/* 상단 라이브 카운터 */}
      <div className="mb-5">
        <p className="text-[11px] font-medium text-gray-500 mb-2">페이지 상단 라이브 카운터</p>
        {settings.top_live_counter_enabled ? (
          <div className="flex justify-center">
            <TopLiveCounter count={sampleLiveCount} min={settings.top_live_counter_min} />
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 text-center py-3 italic">OFF — 카운터가 표시되지 않습니다</p>
        )}
      </div>

      {/* 톤별 배지 */}
      <div className="mb-5">
        <p className="text-[11px] font-medium text-gray-500 mb-2">톤별 배지 (5종)</p>
        {settings.social_proof_enabled ? (
          <div className="flex flex-wrap gap-2 items-center">
            {ALL_TONES.map(({ key, count }) => (
              <SocialProofBadge
                key={key}
                tone={key}
                label={labels[key]}
                count={count}
                emojiPos={emojiPos}
              />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 italic">OFF — 모든 배지가 표시되지 않습니다</p>
        )}
      </div>

      {/* D-day 칩 단계 */}
      <div>
        <p className="text-[11px] font-medium text-gray-500 mb-2">D-day 칩 단계별</p>
        {settings.dday_chip_enabled ? (
          <div className="flex flex-wrap gap-2 items-center">
            {DDAY_SAMPLES.map(({ label, days }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="font-mono">{label}:</span>
                <DDayChip eventDate={dateFromNow(days)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 italic">OFF — D-day 칩이 표시되지 않습니다</p>
        )}
      </div>
    </section>
  );
}

function NumberField({
  label, desc, value, min, max, step, onChange, disabled,
}: {
  label: string; desc?: string; value: number;
  min?: number; max?: number; step?: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <Field label={label} desc={desc}>
      <input
        type="number"
        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        disabled={disabled}
      />
    </Field>
  );
}
