-- ============================================
-- 클루커스 이벤트 v5 마이그레이션 - 이메일 로그 삭제 권한
-- Supabase SQL Editor에서 실행
-- ============================================

CREATE POLICY "Admins can delete email_logs"
  ON email_logs FOR DELETE
  USING (auth.role() = 'authenticated');
