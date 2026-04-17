export type Event = {
  id: string;
  name: string;
  event_date: string;
  event_type: 'online' | 'offline' | 'none';
  status: 'open' | 'closed' | 'ended';
  ended_at: string | null;
  visible: boolean;
  capacity: number | null;
  privacy_category: string;
  category: string;
  location: string;
  event_time: string;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string | null;
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
  email_status: 'confirmed' | 'rejected' | null;
  email_sent_at: string | null;
  registration_status: 'pending' | 'confirmed' | 'rejected';
  survey_enabled: boolean;
  survey_completed: boolean;
  certificate_issued: boolean;
  certificate_issued_at: string | null;
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

export type EmailLog = {
  id: string;
  registration_id: string | null;
  event_id: string | null;
  recipient_email: string;
  recipient_name: string;
  email_type: 'confirmed' | 'rejected';
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string;
  sent_by: string;
  created_at: string;
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
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

export type Survey = {
  id: string;
  registration_id: string;
  q1_azure_level: string;
  q2_difficulty: string;
  q3_purpose: string[];
  q4_adoption: string;
  q5_consulting: string[];
  q6_feedback: string;
  created_at: string;
};
