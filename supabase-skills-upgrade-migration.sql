-- Skills table upgrade: add description, repo_url, install_cmd columns
-- Run this in Supabase SQL Editor

ALTER TABLE skills ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS install_cmd TEXT;

-- Bump name limit from 100 to allow longer skill names (optional, handled in app validation)
