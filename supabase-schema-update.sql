-- Add on-chain tracking fields to agents table
-- Run this in Supabase SQL Editor

ALTER TABLE agents ADD COLUMN IF NOT EXISTS onchain_id INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS onchain_tx TEXT;
