import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get('event_id');
  const supabase = getServiceSupabase();

  let query = supabase.from('survey_questions').select('*').order('sort_order', { ascending: true });

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else {
    query = query.is('event_id', null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { event_id, question_text, question_type, options, required, sort_order } = await req.json();
  if (!question_text?.trim()) return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('survey_questions').insert({
    event_id: event_id || null,
    question_text: question_text.trim(),
    question_type: question_type || 'single',
    options: options || [],
    required: required !== false,
    sort_order: sort_order || 0,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
