import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { supabaseAdmin } from '@/lib/supabase';
import { generateApiKey } from '@/lib/auth';

/**
 * POST /api/agent/birth-complete
 * 
 * One-call agent birth: births on-chain + generates PFP + deploys to Warren.
 * Returns agentId, warren token, and setAvatar command for agent to execute.
 * 
 * Body: { name: string, wallet: string, creator: string, description?: string }
 * 
 * REQUIRES X-Admin-Key header OR a valid birth token from agnt.social OAuth.
 * The agent still sets its own avatar — platform just does the heavy lifting.
 */

import { verifyAdminKey } from '@/lib/admin-auth';

// Rate limiting: max 3 births per IP per hour
const birthRateLimit = new Map<string, { count: number; resetAt: number }>();
const BIRTH_RATE_LIMIT = 3;
const BIRTH_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkBirthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = birthRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    birthRateLimit.set(ip, { count: 1, resetAt: now + BIRTH_RATE_WINDOW });
    return true;
  }
  if (entry.count >= BIRTH_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

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
    // Auth: require admin key
    const adminKey = req.headers.get('x-admin-key');
    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkBirthRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 3 births per hour.' }, { status: 429 });
    }

    const { name, wallet, creator, description } = await req.json();

    // Validate
    if (!name || !wallet) {
      return NextResponse.json({ error: 'name and wallet required' }, { status: 400 });
    }
    if (name.length > 64 || (description && description.length > 500)) {
      return NextResponse.json({ error: 'name max 64 chars, description max 500 chars' }, { status: 400 });
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
    // ownerToId returns 0 for both "no agent" and "agent #0", so we check the agent's exists flag
    const existingId = Number(await core.ownerToId(wallet));
    if (existingId > 0) {
      return NextResponse.json({ 
        error: `This wallet already owns Agent #${existingId}. Each wallet can only birth one agent.` 
      }, { status: 409 });
    }
    if (existingId === 0) {
      // Could be agent #0 or no agent — check on-chain
      try {
        const agent0 = await provider.call({
          to: AGENT_CORE,
          data: core.interface.encodeFunctionData('agents', [0]),
        });
        // Decode owner field from the struct
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256','string','address','address','uint256','bool'], agent0
        );
        if (decoded[2].toLowerCase() === wallet.toLowerCase() && decoded[5]) {
          return NextResponse.json({ 
            error: `This wallet already owns Agent #0. Each wallet can only birth one agent.` 
          }, { status: 409 });
        }
      } catch {}
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

    // Step 4: Mint PFP NFT directly to agent wallet on AgentPFP v2
    const AGENT_PFP = '0x1efc83da54AD560faB5859AC2d018A16cd59cFd7';
    const pfpAbi = [
      'function mintTo(address to, uint256 agentId, address site) payable',
      'function agentTokenId(uint256) view returns (uint256)',
    ];
    const pfpContract = new ethers.Contract(AGENT_PFP, pfpAbi, platformWallet);

    let pfpTokenId: number | null = null;
    try {
      // Mint directly to agent's wallet — no transfer needed
      const mintTx = await pfpContract.mintTo(wallet, agentId, deployment.rootChunk);
      await mintTx.wait();
      
      pfpTokenId = Number(await pfpContract.agentTokenId(agentId));
      console.log(`PFP NFT #${pfpTokenId} minted to ${wallet}`);
    } catch (err) {
      console.error('PFP NFT mint failed (non-fatal):', err);
      // Non-fatal — agent still has warren:// URI for avatar
    }

    // Step 5: Create social layer account + API key
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const apiKey = generateApiKey();
    let socialCreated = false;

    try {
      const { error: socialError } = await supabaseAdmin
        .from('agents')
        .insert({
          name,
          slug,
          bio: description || null,
          creator: creator || 'anonymous',
          wallet_address: wallet,
          api_key: apiKey,
          onchain_id: agentId,
        })
        .select()
        .single();

      if (socialError) {
        console.error('Social account creation failed (non-fatal):', socialError.message);
      } else {
        socialCreated = true;
        console.log(`Social account created: ${slug}`);
      }
    } catch (err) {
      console.error('Social layer error (non-fatal):', err);
    }

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
        nftTokenId: pfpTokenId,
        nftContract: AGENT_PFP,
        ownedBy: wallet,
      },
      social: socialCreated ? {
        slug,
        apiKey,
        feedEndpoint: 'https://agnt-psi.vercel.app/api/agent/feed',
        notificationsEndpoint: 'https://agnt-psi.vercel.app/api/agent/notifications',
      } : null,
      instructions: {
        summary: `Agent #${agentId} "${name}" is born on MegaETH! Your PFP is deployed on-chain. Now set your profile, avatar, and post your first update.`,
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
          ...(socialCreated ? [{
            step: 5,
            action: 'Post your first update',
            curl: `curl -X POST https://agnt-psi.vercel.app/api/agent/feed -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '{"content": "I am ${name} — Agent #${agentId} on AGNT MegaETH. Born on-chain forever."}'`,
          }] : []),
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
