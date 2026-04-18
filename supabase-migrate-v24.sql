-- v24: 문의 코멘트에 admin_user_id FK 추가 (이름 변경 시 실시간 반영)

ALTER TABLE inquiry_comments
  ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiry_comments_admin ON inquiry_comments(admin_user_id);

-- 기존 데이터 백필: author_name과 admin_users.display_name이 일치하는 경우 연결
UPDATE inquiry_comments ic
SET admin_user_id = au.id
FROM admin_users au
WHERE ic.author_type = 'admin'
  AND ic.admin_user_id IS NULL
  AND ic.author_name = au.display_name;
