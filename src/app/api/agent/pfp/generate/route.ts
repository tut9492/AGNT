import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin-auth';

/**
 * POST /api/agent/pfp/generate
 * 
 * Auto-generates a PFP for an agent and deploys to Warren.
 * Returns setAvatar instructions for the agent to execute.
 * 
 * REQUIRES X-Admin-Key header.
 * Body: { agentId: number, name: string, description?: string }
 * 
 * This runs server-side on Vercel — requires canvas + Warren keys.
 * Called automatically after birth, or manually by any agent.
 */

const WARREN_API_URL = process.env.WARREN_API_URL || 'https://thewarren.app';
const WARREN_PARTNER_KEY = process.env.WARREN_PARTNER_KEY;
const MEGAETH_PRIVATE_KEY = process.env.AGNT_MEGAETH_PRIVATE_KEY;
const MEGAETH_RPC = 'https://megaeth.drpc.org';
const MEGAETH_CHAIN_ID = 4326;
const AGENT_PROFILE = '0x30Bb372F5771F40E0215c4Dcc6615036B3359510';

async function warrenFetch(endpoint: string, body: unknown) {
  const resp = await fetch(`${WARREN_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Warren-Partner-Key': WARREN_PARTNER_KEY!,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Warren ${endpoint} failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

export async function POST(req: NextRequest) {
  try {
    // Auth: require admin key
    const adminKey = req.headers.get('x-admin-key');
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId, name, description } = await req.json();

    if (agentId === undefined || !name) {
      return NextResponse.json({ error: 'agentId and name required' }, { status: 400 });
    }

    if (!WARREN_PARTNER_KEY || !MEGAETH_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Warren not configured' }, { status: 500 });
    }

    // Step 1: Generate PFP using auto-pfp logic
    // We dynamically import the generator (it uses node-canvas)
    const { generatePFP } = await import('@/lib/auto-pfp');
    const pngBuffer = generatePFP(name, agentId, description || '');

    // Step 2: Estimate Warren fee
    const estimate = await warrenFetch('/api/partner/estimate-fee', { 
      size: pngBuffer.length 
    });

    // Step 3: Pay relayer
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, MEGAETH_CHAIN_ID);
    const wallet = new ethers.Wallet(MEGAETH_PRIVATE_KEY, provider);
    
    const payTx = await wallet.sendTransaction({
      to: estimate.relayerAddress,
      value: BigInt(estimate.totalWei),
    });
    await payTx.wait();

    // Step 4: Deploy to Warren
    const base64Data = pngBuffer.toString('base64');
    const deployment = await warrenFetch('/api/partner/deploy', {
      data: base64Data,
      paymentTxHash: payTx.hash,
      senderAddress: wallet.address,
      siteType: 'image',
      name: `${name.toLowerCase().replace(/\s+/g, '-')}-pfp`,
    });

    const warrenUri = `warren://${deployment.tokenId}`;

    // Return instructions for agent to set their own avatar
    return NextResponse.json({
      success: true,
      pfp: {
        warrenTokenId: deployment.tokenId,
        warrenUri,
        rootChunk: deployment.rootChunk,
        sizeBytes: pngBuffer.length,
      },
      instructions: {
        summary: `Your PFP has been generated and deployed on-chain. Call setAvatar to use it.`,
        contract: AGENT_PROFILE,
        function: 'setAvatar(uint256,string)',
        args: [agentId, warrenUri],
        chain: { name: 'MegaETH', id: MEGAETH_CHAIN_ID, rpc: MEGAETH_RPC },
        cast: `cast send ${AGENT_PROFILE} "setAvatar(uint256,string)" ${agentId} "${warrenUri}" --rpc-url ${MEGAETH_RPC} --private-key <YOUR_PRIVATE_KEY>`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('PFP generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
