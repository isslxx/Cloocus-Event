import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

// 관리자: 문의 히스토리 조회
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data: comments } = await supabase
    .from('inquiry_comments')
    .select('*')
    .eq('registration_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json(comments || []);
}

// 관리자: 답변 등록
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: '답변 내용을 입력해주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { error } = await supabase.from('inquiry_comments').insert({
    registration_id: id,
    author_type: 'admin',
    author_name: admin.display_name,
    content: content.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 상태를 답변 완료로 변경
  await supabase
    .from('event_registrations')
    .update({ inquiry_status: 'answered' })
    .eq('id', id);

  return NextResponse.json({ success: true });
}

// 관리자: 상태 변경
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { inquiry_status } = await req.json();
  if (!['pending', 'answered', 'dismissed'].includes(inquiry_status)) {
    return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('event_registrations')
    .update({ inquiry_status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
