import { createClient } from '@supabase/supabase-js';
import type { AdminUser } from './types';

export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAdminFromToken(authHeader: string | null): Promise<AdminUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const supabase = getServiceSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return admin as AdminUser | null;
}

export function canEdit(role: string): boolean {
  return role === 'admin' || role === 'editor';
}

export function canDelete(role: string): boolean {
  return role === 'admin';
}
