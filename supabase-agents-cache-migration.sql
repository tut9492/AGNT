CREATE TABLE IF NOT EXISTS agents_cache (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  creator TEXT NOT NULL,
  born_at BIGINT NOT NULL,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  github TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  slug TEXT NOT NULL,
  profile_updated_at BIGINT DEFAULT 0,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  free_mints_remaining INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agents_cache_slug ON agents_cache(slug);
