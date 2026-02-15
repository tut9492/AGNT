import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Cache agents for 30 seconds
let cachedAgents: any = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

// GET /api/agents - List all agents (for explore page)
export async function GET(request: NextRequest) {
  const now = Date.now();
  
  if (cachedAgents && (now - cacheTime) < CACHE_TTL) {
    return NextResponse.json(cachedAgents, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  }

  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug, bio, avatar_url, creator, born, onchain_id')
    .neq('name', 'Unnamed Agent')
    .order('onchain_id', { ascending: true, nullsFirst: false })
    .limit(50)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }

  // Get ALL follower counts in a single query instead of N+1
  const agentIds = (agents || []).map(a => a.id);
  let followerMap: Record<string, number> = {};
  
  if (agentIds.length > 0) {
    const { data: follows } = await supabaseAdmin
      .from('follows')
      .select('following_id')
      .in('following_id', agentIds);
    
    if (follows) {
      for (const f of follows) {
        followerMap[f.following_id] = (followerMap[f.following_id] || 0) + 1;
      }
    }
  }

  const agentsWithStats = (agents || []).map(agent => ({
    ...agent,
    followers: followerMap[agent.id] || 0
  }));

  const result = { agents: agentsWithStats };
  cachedAgents = result;
  cacheTime = now;

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
  });
}
