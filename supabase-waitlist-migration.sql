-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  handle text NOT NULL UNIQUE,
  ip text,
  created_at timestamptz DEFAULT now()
);

-- Allow service role full access
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON waitlist FOR ALL USING (true) WITH CHECK (true);
