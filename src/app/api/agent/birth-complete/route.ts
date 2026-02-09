import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * POST /api/agent/birth-complete
 * 
 * One-call agent birth: births on-chain + generates PFP + deploys to Warren.
 * Returns agentId, warren token, and setAvatar command for agent to execute.
 * 
 * Body: { name: string, wallet: string, creator: string, description?: string }
 * 
 * The agent still sets its own avatar — platform just does the heavy lifting.
 */

const MEGAETH_RPC = 'https://megaeth.drpc.org';
const MEGAETH_CHAIN_ID = 4326;
const AGENT_CORE = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF';
const AGENT_PROFILE = '0xa42BE49eB52fBB8889cDdfDe8f78F5FE3cEF094E';
const WARREN_API_URL = process.env.WARREN_API_URL || 'https://thewarren.app';
const WARREN_PARTNER_KEY = process.env.WARREN_PARTNER_KEY;
const MEGAETH_PRIVATE_KEY = process.env.AGNT_MEGAETH_PRIVATE_KEY;

const CORE_ABI = [
  'function birth(string name, address agentWallet) returns (uint256)',
  'function freeMintsRemaining() view returns (uint256)',
  'function nextAgentId() view returns (uint256)',
  'function ownerToId(address) view returns (uint256)',
];

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
    const { name, wallet, creator, description } = await req.json();

    // Validate
    if (!name || !wallet) {
      return NextResponse.json({ error: 'name and wallet required' }, { status: 400 });
    }
    if (!ethers.isAddress(wallet)) {
      return NextResponse.json({ error: 'invalid wallet address' }, { status: 400 });
    }
    if (!WARREN_PARTNER_KEY || !MEGAETH_PRIVATE_KEY) {
      return NextResponse.json({ error: 'server not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, MEGAETH_CHAIN_ID);
    const platformWallet = new ethers.Wallet(MEGAETH_PRIVATE_KEY, provider);
    const core = new ethers.Contract(AGENT_CORE, CORE_ABI, platformWallet);

    // Check free mints
    const freeRemaining = await core.freeMintsRemaining();
    if (Number(freeRemaining) <= 0) {
      return NextResponse.json({ error: 'Genesis is full. Paid minting coming soon.' }, { status: 403 });
    }

    // Check if wallet already has an agent
    const existingId = await core.ownerToId(wallet);
    if (Number(existingId) > 0) {
      // Wallet already birthed — check if it's a real agent (id 0 is special)
      // ownerToId returns 0 for unregistered, but agent #0 is valid
      // We need to check if exists
      return NextResponse.json({ 
        error: `This wallet already owns Agent #${existingId}. Each wallet can only birth one agent.` 
      }, { status: 409 });
    }

    // Step 1: Birth on-chain
    console.log(`Birthing ${name} for wallet ${wallet}...`);
    const birthTx = await core.birth(name, wallet);
    const receipt = await birthTx.wait();
    
    // Get agent ID from event
    const birthEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = core.interface.parseLog({ topics: log.topics as string[], data: log.data });
        return parsed?.name === 'AgentBorn';
      } catch { return false; }
    });
    
    let agentId: number;
    if (birthEvent) {
      const parsed = core.interface.parseLog({ topics: birthEvent.topics as string[], data: birthEvent.data });
      agentId = Number(parsed!.args[0]);
    } else {
      // Fallback: read from ownerToId
      agentId = Number(await core.ownerToId(wallet));
    }

    console.log(`Agent #${agentId} born: ${name}`);

    // Step 2: Generate PFP
    const { generatePFP } = await import('@/lib/auto-pfp');
    const pngBuffer = generatePFP(name, agentId, description || name);

    // Step 3: Deploy PFP to Warren
    console.log(`Deploying PFP to Warren (${pngBuffer.length} bytes)...`);
    
    const estimate = await warrenFetch('/api/partner/estimate-fee', { 
      size: pngBuffer.length 
    });

    const payTx = await platformWallet.sendTransaction({
      to: estimate.relayerAddress,
      value: BigInt(estimate.totalWei),
    });
    await payTx.wait();

    const base64Data = pngBuffer.toString('base64');
    const deployment = await warrenFetch('/api/partner/deploy', {
      data: base64Data,
      paymentTxHash: payTx.hash,
      senderAddress: platformWallet.address,
      siteType: 'image',
      name: `${name.toLowerCase().replace(/\s+/g, '-')}-pfp`,
    });

    const warrenUri = `warren://${deployment.tokenId}`;
    console.log(`PFP deployed: ${warrenUri}`);

    // Return everything the agent needs
    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name,
        wallet,
        creator: creator || '',
        birthTx: birthTx.hash,
      },
      pfp: {
        warrenTokenId: deployment.tokenId,
        warrenUri,
        rootChunk: deployment.rootChunk,
      },
      instructions: {
        summary: `Agent #${agentId} "${name}" is born on MegaETH! Your PFP is deployed on-chain. Now set your profile and avatar.`,
        steps: [
          {
            step: 1,
            action: 'Set your avatar',
            cast: `cast send ${AGENT_PROFILE} "setAvatar(uint256,string)" ${agentId} "${warrenUri}" --private-key <YOUR_KEY> --rpc-url ${MEGAETH_RPC}`,
          },
          {
            step: 2,
            action: 'Set your bio',
            cast: `cast send ${AGENT_PROFILE} "setBio(uint256,string)" ${agentId} "<your bio>" --private-key <YOUR_KEY> --rpc-url ${MEGAETH_RPC}`,
          },
          {
            step: 3,
            action: 'Set your skills',
            cast: `cast send ${AGENT_PROFILE} "setTags(uint256,string[])" ${agentId} '["skill1","skill2"]' --private-key <YOUR_KEY> --rpc-url ${MEGAETH_RPC}`,
          },
          {
            step: 4,
            action: 'Set your links (website=app, twitter=creator, github=API)',
            cast: `cast send ${AGENT_PROFILE} "setLinks(uint256,string,string,string)" ${agentId} "<app_url>" "${creator || '<creator>'}" "<api_url>" --private-key <YOUR_KEY> --rpc-url ${MEGAETH_RPC}`,
          },
        ],
        warning: 'NEVER use setProfile() — it overwrites ALL fields including avatar. Always use individual setters.',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Birth error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
