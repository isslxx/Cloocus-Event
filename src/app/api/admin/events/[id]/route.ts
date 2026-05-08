import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';
import { baseSlugFromDate, pickAvailableSlug } from '@/lib/slug';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const updates = await req.json();
  const supabase = getServiceSupabase();

  const allowed = ['name', 'slug', 'event_date', 'event_type', 'status', 'location', 'event_time', 'visible', 'capacity', 'privacy_category', 'category', 'ended_at', 'custom_questions_section_title', 'promo_url', 'summary', 'event_date_end'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  // promo_url 빈 문자열은 null 로 정규화
  if ('promo_url' in filtered && typeof filtered.promo_url === 'string') {
    filtered.promo_url = filtered.promo_url.trim() || null;
  }
  // summary 빈 문자열은 null. 280자 제한.
  if ('summary' in filtered && typeof filtered.summary === 'string') {
    filtered.summary = filtered.summary.trim().slice(0, 280) || null;
  }
  // event_date_end 빈 문자열은 null
  if ('event_date_end' in filtered && (filtered.event_date_end === '' || filtered.event_date_end === undefined)) {
    filtered.event_date_end = null;
  }

  // slug 처리:
  //  - 빈 값으로 들어오면 event_date 기준으로 자동 재생성 (NULL 로 두지 않음 — URL 접근 불가 방지)
  //  - 값이 있으면 다른 이벤트와 충돌 검사
  const slugProvided = 'slug' in filtered;
  if (slugProvided) {
    const s = String(filtered.slug || '').trim();
    if (s) {
      const { data: dup } = await supabase
        .from('events')
        .select('id')
        .eq('slug', s)
        .neq('id', id)
        .maybeSingle();
      if (dup) {
        return NextResponse.json({ error: '이미 사용 중인 URL slug 입니다.' }, { status: 409 });
      }
      filtered.slug = s;
    } else {
      // 빈 값 → 새로 만들기 위해 일단 키를 제거하고 아래 분기에서 처리
      delete filtered.slug;
    }
  }

  // 자동 재생성 분기:
  //  (a) slug 가 비어 있는 경우(위에서 삭제됨)
  //  (b) event_date 가 변경되었고 slug 가 명시되지 않은 경우
  const needsRegenerate = (slugProvided && !('slug' in filtered)) || ('event_date' in filtered && !slugProvided);
  if (needsRegenerate) {
    const newDate = (filtered.event_date as string | undefined) ?? null;
    let base = newDate ? baseSlugFromDate(newDate) : '';
    let currentSlug: string | null = null;
    if (!base || !slugProvided) {
      const { data: current } = await supabase
        .from('events')
        .select('slug, event_date')
        .eq('id', id)
        .maybeSingle();
      currentSlug = (current?.slug as string | null) || null;
      if (!base && current?.event_date) base = baseSlugFromDate(current.event_date as string);
    }
    if (base) {
      const startsWithBase = currentSlug && (currentSlug === base || currentSlug.startsWith(`${base}-`));
      // event_date 변경이 아닌 단순 slug 비우기인 경우, 기존 slug 와 같은 base 면 그대로 두기보다 새로 부여(충돌 회피)
      if (slugProvided || !startsWithBase) {
        const { data: collisions } = await supabase
          .from('events')
          .select('slug, id')
          .or(`slug.eq.${base},slug.like.${base}-%`);
        const taken = new Set<string>(
          (collisions || [])
            .filter((r) => r.id !== id)
            .map((r) => r.slug)
            .filter(Boolean) as string[]
        );
        filtered.slug = pickAvailableSlug(base, taken);
      }
    }
  }

  const { error } = await supabase.from('events').update(filtered).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
