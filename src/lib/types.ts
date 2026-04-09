export type Registration = {
  id: string;
  name: string;
  company_name: string;
  company_name_raw: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  industry: string;
  company_size: string;
  referral_source: string;
  referrer_name: string;
  inquiry: string;
  privacy_consent: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
};

export type AuditEntry = {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: 'update' | 'delete';
  target_table: string;
  target_id: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
};
