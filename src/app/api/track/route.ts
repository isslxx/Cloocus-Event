import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isInternalRequest } from '@/lib/internal-ip';

// 경량 이벤트 ingest 엔드포인트 (view / click)
// - 인증 없음 (공개 트래킹)
// - service role key로 page_events 테이블에 직접 삽입
// - 잘못된 input에도 항상 204-ish 응답 (클라이언트 retry 방지)

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_LEN = 512;
function s(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, MAX_LEN);
}

function uuid(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
}

function detectDevice(ua: string | null): string | null {
  if (!ua) return null;
  const u = ua.toLowerCase();
  if (/(iphone|ipod|android.*mobile|windows phone|mobile)/.test(u)) return 'mobile';
  if (/(ipad|tablet|android(?!.*mobile))/.test(u)) return 'tablet';
  return 'desktop';
}

export async function POST(req: NextRequest) {
  try {
    // 내부 IP는 트래킹 제외 (데이터 정확도)
    if (isInternalRequest(req.headers)) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ ok: true });

    const action = s(body.action_type);
    if (action !== 'view' && action !== 'click') return NextResponse.json({ ok: true });

    const page = s(body.page);
    const session_id = s(body.session_id);
    if (!page || !session_id) return NextResponse.json({ ok: true });

    const ua = req.headers.get('user-agent') || null;
    const device_type = detectDevice(ua);

    const row = {
      session_id,
      user_id:      s(body.user_id),
      event_id:     uuid(body.event_id),
      page,
      action_type:  action,
      element_id:   s(body.element_id),
      utm_source:   s(body.utm_source),
      utm_medium:   s(body.utm_medium),
      utm_campaign: s(body.utm_campaign),
      utm_content:  s(body.utm_content),
      utm_term:     s(body.utm_term),
      referrer_url: s(body.referrer_url),
      landing_page: s(body.landing_page),
      device_type,
      user_agent:   ua ? ua.slice(0, MAX_LEN) : null,
    };

    const supabase = getServiceSupabase();
    await supabase.from('page_events').insert(row);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
