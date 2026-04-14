import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || '기타';
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data } = await supabase
    .from('privacy_policies')
    .select('content, title')
    .eq('category', category)
    .maybeSingle();

  return NextResponse.json({ content: data?.content || '', title: data?.title || '개인정보 수집 및 이용 동의' });
}
