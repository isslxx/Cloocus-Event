import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { question, answer, sort_order, active } = await req.json();
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: '질문과 답변을 입력해주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('faqs').insert({
    question: question.trim(),
    answer: answer.trim(),
    sort_order: sort_order || 0,
    active: active !== false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
