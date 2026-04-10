import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase, canEdit } from '@/lib/supabase-auth';

export async function POST(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

  const supabase = getServiceSupabase();

  // email_logs만 삭제 (등록 데이터에 영향 없음)
  const { error } = await supabase
    .from('email_logs')
    .delete()
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
