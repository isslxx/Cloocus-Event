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

  // 카테고리 + FAQ 병렬 조회
  const [categoriesRes, faqsRes] = await Promise.all([
    supabase
      .from('faq_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('faqs')
      .select('id, question, answer, category_id, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .range(0, 9999),
  ]);

  const categories = categoriesRes.data;
  const faqs = faqsRes.data;
  const error = faqsRes.error;

  if (error) return NextResponse.json({ categories: [], faqs: [] });
  return NextResponse.json(
    {
      categories: categories || [],
      faqs: faqs || [],
    },
    {
      headers: {
        // 60초 브라우저 캐시, 300초 CDN 캐시, stale-while-revalidate 3600초
        'Cache-Control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=3600',
      },
    }
  );
}
