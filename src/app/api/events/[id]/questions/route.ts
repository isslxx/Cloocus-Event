import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json([], { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('event_custom_questions')
    .select('id, question_type, label, description, options, required, allow_etc, sort_order')
    .eq('event_id', id)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
