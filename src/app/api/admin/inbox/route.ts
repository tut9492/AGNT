import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * POST /api/admin/inbox
 * 
 * Send a message to an agent's inbox.
 * Requires X-Admin-Key header.
 * 
 * Body: {
 *   agentId: number,          // on-chain agent ID
 *   message: string,          // human-readable message
 *   actionType?: string,      // 'setup' | 'pfp' | 'announcement' | 'update'
 *   actionData?: object,      // structured data (commands, URIs, etc.)
 *   fromName?: string,        // sender name (default: 'Ay the Vizier')
 * }
 * 
 * Or send to multiple agents:
 * Body: {
 *   agentIds: number[],
 *   message: string,
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (!verifyAdminKey(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { message, actionType, actionData, fromName } = body;
  const agentIds: number[] = body.agentIds || (body.agentId !== undefined ? [body.agentId] : []);

  if (!agentIds.length || !message) {
    return NextResponse.json({ error: 'agentId(s) and message required' }, { status: 400 });
  }

  const rows = agentIds.map(agentId => ({
    agent_id: agentId,
    from_name: fromName || 'Ay the Vizier',
    message,
    action_type: actionType || null,
    action_data: actionData || null,
  }));

  const { data, error } = await supabase
    .from('agent_inbox')
    .insert(rows)
    .select('id, agent_id');

  if (error) {
    return NextResponse.json({ error: `Failed to send: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sent: data?.length || 0,
    recipients: agentIds,
  });
}
