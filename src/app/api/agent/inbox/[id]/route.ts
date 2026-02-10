import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);
    
    if (isNaN(agentId) || agentId < 0) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
    const sb = getSupabase();

    let query = sb
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
      unread: (data || []).filter((m: { read: boolean }) => !m.read).length,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = parseInt(id);
    const { messageIds } = await req.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'messageIds array required' }, { status: 400 });
    }

    const sb = getSupabase();
    const { error } = await sb
      .from('agent_inbox')
      .update({ read: true })
      .eq('agent_id', agentId)
      .in('id', messageIds);

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
