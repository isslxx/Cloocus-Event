import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken, getServiceSupabase } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from('event_registrations')
    .select('event_id, survey_enabled, survey_completed')
    .is('deleted_at', null);

  const stats: Record<string, { enabled: number; completed: number }> = {};

  for (const r of data || []) {
    if (!r.event_id) continue;
    if (!stats[r.event_id]) stats[r.event_id] = { enabled: 0, completed: 0 };
    if (r.survey_enabled) stats[r.event_id].enabled++;
    if (r.survey_completed) stats[r.event_id].completed++;
  }

  return NextResponse.json(stats);
}
