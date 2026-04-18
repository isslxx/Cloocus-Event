-- v25: 모든 public 테이블에 RLS 활성화
-- 정책을 추가하지 않음 → anon/authenticated 키로는 접근 불가
-- service role key(서버 API)는 RLS를 우회하므로 기존 동작 그대로 유지

-- Supabase Security Advisor 경고 해결
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- 기존에 RLS가 비활성화된 다른 테이블도 함께 보호 (선택)
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;
