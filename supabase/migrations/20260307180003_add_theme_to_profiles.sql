ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system'))
