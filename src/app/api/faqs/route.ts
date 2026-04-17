import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getServiceSupabase();

  // 카테고리 조회
  const { data: categories } = await supabase
    .from('faq_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  // FAQ 조회 (카테고리 정보 포함)
  const { data: faqs, error } = await supabase
    .from('faqs')
    .select('id, question, answer, category_id, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ categories: [], faqs: [] });
  return NextResponse.json({
    categories: categories || [],
    faqs: faqs || [],
  });
}
