// 등록 시각은 DB 에 UTC ISO 로 저장되지만, 운영자는 한국 표준시(KST)
// 기준으로만 본다. AM/PM 12시간제는 정렬 시 오전·오후가 섞여 보이고
// "AM 8:14" 같은 표기가 모호하기 때문에 24시간제(00~23)로 통일한다.
//
// 포맷:
//   formatKST(v)                      → "2026-05-14 14:30"        (분 단위, 목록·상세 공용)
//   formatKST(v, { withSeconds: true })→ "2026-05-14 14:30:45"     (초 단위, XLSX/CSV 내보내기)
//   formatKST(v, { dateOnly: true })  → "2026-05-14"               (날짜만)

const TZ = 'Asia/Seoul';

export function formatKST(
  value: string | Date | null | undefined,
  opts: { withSeconds?: boolean; dateOnly?: boolean } = {},
): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(opts.dateOnly
      ? {}
      : {
          hour: '2-digit',
          minute: '2-digit',
          ...(opts.withSeconds ? { second: '2-digit' } : {}),
          hour12: false,
        }),
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // Intl 의 hour 가 24시간제에서 가끔 "24" 로 나오는 케이스 보정 (자정 → 00)
  const hour = get('hour') === '24' ? '00' : get('hour');
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  if (opts.dateOnly) return date;
  const time = opts.withSeconds
    ? `${hour}:${get('minute')}:${get('second')}`
    : `${hour}:${get('minute')}`;
  return `${date} ${time}`;
}
