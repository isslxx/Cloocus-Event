import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, canEdit, getServiceSupabase } from '@/lib/supabase-auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const updates = await req.json();
  const supabase = getServiceSupabase();

  // 기존 레코드 조회 (감사 로그용)
  const { data: old } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!old) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 복구 처리
  if (updates.restore === true) {
    await supabase.from('event_registrations').update({ deleted_at: null }).eq('id', id);
    return NextResponse.json({ success: true });
  }

  // 허용 필드만 업데이트
  const allowedFields = [
    'name', 'company_name', 'company_name_raw', 'department', 'job_title',
    'email', 'phone', 'industry', 'company_size', 'referral_source',
    'referrer_name', 'inquiry', 'privacy_consent',
  ];
  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }

  const { error } = await supabase
    .from('event_registrations')
    .update(filtered)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 변경사항 diff 계산 + 감사 로그
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, val] of Object.entries(filtered)) {
    if (old[key as keyof typeof old] !== val) {
      changes[key] = { old: old[key as keyof typeof old], new: val };
    }
  }

  if (Object.keys(changes).length > 0) {
    await supabase.from('audit_log').insert({
      admin_user_id: admin.id,
      admin_email: admin.email,
      action: 'update',
      target_id: id,
      changes,
    });
  }

  return NextResponse.json({ success: true });
}
