// event_date 기반 URL slug 생성. YYYYMMDD 형식, 충돌 시 -2, -3 ...
// existingSlugs 는 같은 base 를 사용하는 다른 이벤트의 slug 모음(현재 편집 중인 이벤트 본인은 제외).

export function baseSlugFromDate(eventDate: string | Date): string {
  const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function pickAvailableSlug(base: string, existing: Set<string>): string {
  if (!base) return base;
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
