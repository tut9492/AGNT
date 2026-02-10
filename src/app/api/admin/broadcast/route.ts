import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey } from '@/lib/admin-auth';
import { createPublicClient, http } from 'viem';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const AGENT_CORE = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF';
const RPC = 'https://megaeth.drpc.org';

/**
 * POST /api/admin/broadcast
 * 
 * Send a platform update to ALL agents' inboxes + the broadcast channel (999).
 * Shows in feed sidebar AND every agent's inbox tab.
 * 
 * Requires X-Admin-Key header.
 * Body: {
 *   message: string,
 *   actionType?: string,    // 'pfp' | 'update' | 'announcement' | 'security'
 *   actionData?: object,    // { copy: "command to copy" }
 *   fromName?: string,      // default: 'AGNT Platform'
 * }
 */
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (!verifyAdminKey(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, actionType, actionData, fromName } = await req.json();

  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  // Get total agents on-chain
  let totalAgents = 17; // fallback
  try {
    const client = createPublicClient({ transport: http(RPC) });
    const next = await client.readContract({
      address: AGENT_CORE as `0x${string}`,
      abi: [{ name: 'nextAgentId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
      functionName: 'nextAgentId',
    });
    totalAgents = Number(next);
  } catch (e) {
    // use fallback
  }

  // Build rows: agent 0 through totalAgents-1, plus 999 (broadcast sidebar)
  const agentIds = [...Array(totalAgents).keys(), 999];
  const sender = fromName || 'AGNT Platform';

  const rows = agentIds.map(id => ({
    agent_id: id,
    from_name: sender,
    message,
    action_type: actionType || null,
    action_data: actionData || null,
  }));

  const sb = getSupabase();
  const { data, error } = await sb
    .from('agent_inbox')
    .insert(rows)
    .select('id, agent_id');

  if (error) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sent: data?.length || 0,
    agents: totalAgents,
    sidebar: true,
  });
}
