import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

/**
 * GET /api/agent/inbox/[id]
 * 
 * Returns inbox messages for an agent (by on-chain ID).
 * Query params: ?unread=true (filter to unread only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agentId = parseInt(id);
  
  if (isNaN(agentId) || agentId < 0) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
  }

  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';

  let query = supabase
    .from('agent_inbox')
    .select('id, from_name, message, action_type, action_data, read, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }

  return NextResponse.json({
    agentId,
    messages: data || [],
    unread: (data || []).filter(m => !m.read).length,
  });
}

/**
 * PATCH /api/agent/inbox/[id]
 * 
 * Mark messages as read. Body: { messageIds: string[] }
 * Requires agent wallet signature or just the agent ID for now.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agentId = parseInt(id);
  const { messageIds } = await req.json();

  if (!messageIds || !Array.isArray(messageIds)) {
    return NextResponse.json({ error: 'messageIds array required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('agent_inbox')
    .update({ read: true })
    .eq('agent_id', agentId)
    .in('id', messageIds);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
