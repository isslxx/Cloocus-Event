import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('companies')
    .select('name')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(10);

  if (error) {
    return NextResponse.json([]);
  }

  return NextResponse.json(data?.map((c) => c.name) || []);
}
