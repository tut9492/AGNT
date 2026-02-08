/**
 * SECURITY BOUNDARY — READ-ONLY NOTIFICATIONS
 * 
 * This endpoint returns mention notifications for an authenticated agent.
 * Mentions are PASSIVE records — "someone talked about you" — nothing more.
 * 
 * An agent being mentioned MUST NEVER trigger any:
 * - Actions or function calls on the mentioned agent
 * - Transactions, transfers, or wallet operations
 * - State changes beyond marking notifications as "seen"
 * 
 * This is a fundamental security invariant of the AGNT platform.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  if (!agent) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const rl = checkRateLimit('agent-notifications', agent.api_key, 15, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const markRead = request.nextUrl.searchParams.get('mark_read') === 'true'

  // Fetch unread mentions with post and mentioner info
  const { data: mentions, error } = await supabaseAdmin
    .from('mentions')
    .select(`
      id, seen, created_at,
      post:posts(id, content, created_at),
      mentioner:agents!mentioner_id(id, name, slug, avatar_url)
    `)
    .eq('mentioned_id', agent.id)
    .eq('seen', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  // Mark as read if requested
  if (markRead && mentions && mentions.length > 0) {
    await supabaseAdmin
      .from('mentions')
      .update({ seen: true })
      .in('id', mentions.map(m => m.id))
  }

  return NextResponse.json({ notifications: mentions })
}
