import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 신청자: 본인 문의 히스토리 조회
export async function GET(req: NextRequest) {
  const registrationId = req.nextUrl.searchParams.get('registration_id');
  const pin = req.nextUrl.searchParams.get('pin');
  if (!registrationId || !pin) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // PIN 검증
  const { data: reg } = await supabase
    .from('event_registrations')
    .select('id, pin, inquiry, inquiry_status')
    .eq('id', registrationId)
    .maybeSingle();

  if (!reg || reg.pin !== pin) {
    return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 });
  }

  const { data: comments } = await supabase
    .from('inquiry_comments')
    .select('*')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: true });

  // admin_user_id가 있는 코멘트는 현재 display_name으로 덮어쓰기
  const adminIds = [...new Set((comments || []).filter((c) => c.admin_user_id).map((c) => c.admin_user_id))];
  let adminNameMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('id, display_name')
      .in('id', adminIds);
    adminNameMap = Object.fromEntries((admins || []).map((a) => [a.id, a.display_name]));
  }

  const resolvedComments = (comments || []).map((c) => ({
    ...c,
    author_name: c.admin_user_id && adminNameMap[c.admin_user_id] ? adminNameMap[c.admin_user_id] : c.author_name,
  }));

  return NextResponse.json({
    inquiry: reg.inquiry,
    inquiry_status: reg.inquiry_status || 'pending',
    comments: resolvedComments,
  });
}

// 신청자: 추가 문의 등록
export async function POST(req: NextRequest) {
  const { registration_id, pin, content, author_name } = await req.json();
  if (!registration_id || !pin || !content?.trim()) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // PIN 검증
  const { data: reg } = await supabase
    .from('event_registrations')
    .select('id, pin')
    .eq('id', registration_id)
    .maybeSingle();

  if (!reg || reg.pin !== pin) {
    return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 });
  }

  // 코멘트 추가
  const { error } = await supabase.from('inquiry_comments').insert({
    registration_id,
    author_type: 'applicant',
    author_name: author_name?.trim() || '신청자',
    content: content.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 상태를 답변 대기로 변경
  await supabase
    .from('event_registrations')
    .update({ inquiry_status: 'pending' })
    .eq('id', registration_id);

  return NextResponse.json({ success: true });
}
