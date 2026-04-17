import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids, updates, reorder } = await req.json();

  const supabase = getServiceSupabase();

  // 일괄 활성/비활성 업데이트
  if (ids && updates) {
    const allowed = ['active', 'category_id', 'sort_order'];
    const filtered: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) filtered[key] = updates[key];
    }
    const { error } = await supabase.from('faqs').update(filtered).in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 순서 재정렬 (배열: [{ id, sort_order, category_id }])
  if (reorder && Array.isArray(reorder)) {
    for (const item of reorder) {
      const upd: Record<string, unknown> = { sort_order: item.sort_order };
      if ('category_id' in item) upd.category_id = item.category_id;
      await supabase.from('faqs').update(upd).eq('id', item.id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids } = await req.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: '삭제할 항목을 선택해주세요.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('faqs').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
