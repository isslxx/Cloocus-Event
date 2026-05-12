/**
 * /api/admin/settings — 운영 설정 (admin_settings, id=1)
 *
 * GET: 현재 설정 반환 (auth: admin/editor/viewer 모두 조회 가능)
 * PUT: 설정 업데이트 (auth: admin/editor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

const DEFAULTS = {
  social_proof_enabled: true,
  social_proof_emoji_position: 'end' as 'none' | 'end',
  social_proof_labels: {
    urgent:  '마감 임박 · 신청 증가 중',
    hot:     '실시간 인기 급상승',
    rising:  '방금 신청이 빠르게 늘고 있어요',
    live:    '10명 이상이 동시 접속 중',
    popular: '현재 가장 많이 조회되는 이벤트',
  },
  social_proof_thresholds: {
    live_min: 10,
    rising_recent_min: 5,
    rising_window_minutes: 15,
    hot_multiplier: 2.0,
    urgent_dday_within: 2,
    urgent_capacity_pct: 0.8,
  },
  top_live_counter_enabled: true,
  top_live_counter_min: 3,
  dday_chip_enabled: true,
};

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    // 테이블 미존재(마이그레이션 전) 대응 — defaults 응답
    return NextResponse.json({ ...DEFAULTS, _migrated: false });
  }
  if (!data) {
    return NextResponse.json({ ...DEFAULTS, _migrated: true });
  }
  return NextResponse.json({ ...data, _migrated: true });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  // 입력 검증 — 알려진 컬럼만 허용
  const patch: Record<string, unknown> = {};

  if (typeof body.social_proof_enabled === 'boolean') {
    patch.social_proof_enabled = body.social_proof_enabled;
  }
  if (body.social_proof_emoji_position === 'none' || body.social_proof_emoji_position === 'end') {
    patch.social_proof_emoji_position = body.social_proof_emoji_position;
  }
  if (body.social_proof_labels && typeof body.social_proof_labels === 'object') {
    // 미존재 키 보강
    patch.social_proof_labels = {
      ...DEFAULTS.social_proof_labels,
      ...body.social_proof_labels,
    };
  }
  if (body.social_proof_thresholds && typeof body.social_proof_thresholds === 'object') {
    patch.social_proof_thresholds = {
      ...DEFAULTS.social_proof_thresholds,
      ...body.social_proof_thresholds,
    };
  }
  if (typeof body.top_live_counter_enabled === 'boolean') {
    patch.top_live_counter_enabled = body.top_live_counter_enabled;
  }
  if (typeof body.top_live_counter_min === 'number' && body.top_live_counter_min >= 0) {
    patch.top_live_counter_min = Math.min(1000, Math.floor(body.top_live_counter_min));
  }
  if (typeof body.dday_chip_enabled === 'boolean') {
    patch.dday_chip_enabled = body.dday_chip_enabled;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('admin_settings')
    .upsert({ id: 1, ...patch }, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
