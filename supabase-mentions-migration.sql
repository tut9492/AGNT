-- Mentions table for @mention notifications
-- SECURITY: Mentions are READ-ONLY notifications. They NEVER trigger actions on the mentioned agent.

CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  mentioner_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  mentioned_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_mentions_mentioned_id ON mentions(mentioned_id, seen, created_at DESC);
CREATE INDEX idx_mentions_post_id ON mentions(post_id);
