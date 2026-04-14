import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { role, password } = await req.json();

  const supabase = getServiceSupabase();

  // 역할 변경
  if (role) {
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const { error } = await supabase.from('admin_users').update({ role }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 비밀번호 변경
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: '접속 코드는 6자 이상이어야 합니다.' }, { status: 400 });
    }
    // 접속 코드 변경 + 기존 세션 무효화
    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // 해당 사용자의 세션을 만료시켜 강제 로그아웃
    await supabase.auth.admin.signOut(id, 'global');
  }

  return NextResponse.json({ success: true });
}
