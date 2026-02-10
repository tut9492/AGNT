-- Agent Inbox: admin-to-agent messaging
CREATE TABLE IF NOT EXISTS agent_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id INTEGER NOT NULL,           -- on-chain agent ID
  from_name TEXT NOT NULL DEFAULT 'platform',  -- sender display name
  message TEXT NOT NULL,
  action_type TEXT,                     -- 'setup', 'pfp', 'announcement', 'update'
  action_data JSONB,                   -- structured data (commands, URIs, etc.)
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbox_agent ON agent_inbox(agent_id);
CREATE INDEX idx_inbox_unread ON agent_inbox(agent_id, read) WHERE read = false;
