import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET() {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('form_options')
    .select('field_key, label')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  const options: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!options[row.field_key]) options[row.field_key] = [];
    options[row.field_key].push(row.label);
  }

  return NextResponse.json(options);
}
