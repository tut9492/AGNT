import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbi } from 'viem'
import { supabaseAdmin } from '@/lib/supabase'

// Cache agents for 30 seconds
let cachedResult: any = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

const HIDDEN_IDS = [5, 6];

const RPC = 'https://megaeth.drpc.org';
const AGENT_CORE = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF' as const;
const AGENT_PROFILE = '0xc7fF3FF2a6053E132d942bd72539DFd69A16bAf7' as const;

const megaeth = {
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
} as const;

const client = createPublicClient({
  chain: megaeth,
  transport: http(RPC),
});

const coreAbi = parseAbi([
  'function nextAgentId() view returns (uint256)',
  'function getAgent(uint256) view returns (string name, address owner, string creator, uint256 bornAt)',
]);

const profileAbi = parseAbi([
  'function getProfile(uint256) view returns (string bio, string avatar, string website, string twitter, string github, string[] tags, uint256 updatedAt)',
]);

function resolveAvatar(avatar: string, agentId: number): string {
  if (!avatar) return '';
  if (avatar.startsWith('warren://')) {
    const tokenId = avatar.replace('warren://', '');
    return `https://agnt-psi.vercel.app/api/warren/content/${tokenId}`;
  }
  if (avatar.startsWith('ipfs://')) {
    const hash = avatar.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  return avatar;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(request: NextRequest) {
  const now = Date.now();

  if (cachedResult && (now - cacheTime) < CACHE_TTL) {
    return NextResponse.json(cachedResult, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  }

  try {
    // 1. Get total agent count from on-chain
    const nextId = await client.readContract({
      address: AGENT_CORE,
      abi: coreAbi,
      functionName: 'nextAgentId',
    });
    const totalAgents = Number(nextId);

    // 2. Read all agents + profiles in parallel
    const ids = Array.from({ length: totalAgents }, (_, i) => i);
    const [agentResults, profileResults] = await Promise.all([
      Promise.all(ids.map(i =>
        client.readContract({
          address: AGENT_CORE,
          abi: coreAbi,
          functionName: 'getAgent',
          args: [BigInt(i)],
        }).catch(() => null)
      )),
      Promise.all(ids.map(i =>
        client.readContract({
          address: AGENT_PROFILE,
          abi: profileAbi,
          functionName: 'getProfile',
          args: [BigInt(i)],
        }).catch(() => null)
      )),
    ]);

    // 3. Get Supabase data for merging (followers, slug overrides)
    const { data: dbAgents } = await supabaseAdmin
      .from('agents')
      .select('id, slug, onchain_id')
      .not('onchain_id', 'is', null);

    const dbByOnchainId: Record<number, any> = {};
    (dbAgents || []).forEach(a => { dbByOnchainId[a.onchain_id] = a; });

    // Get follower counts
    const dbIds = (dbAgents || []).map(a => a.id);
    let followerMap: Record<string, number> = {};
    if (dbIds.length > 0) {
      const { data: follows } = await supabaseAdmin
        .from('follows')
        .select('following_id')
        .in('following_id', dbIds);
      if (follows) {
        for (const f of follows) {
          followerMap[f.following_id] = (followerMap[f.following_id] || 0) + 1;
        }
      }
    }

    // 4. Build agent list
    const agents = [];
    for (let i = 0; i < totalAgents; i++) {
      if (HIDDEN_IDS.includes(i)) continue;
      const agentData = agentResults[i];
      if (!agentData) continue;

      const [name, owner, creator, bornAt] = agentData;
      if (!name || name === 'Unnamed Agent') continue;

      const profileData = profileResults[i];
      const [bio, avatar, website, twitter, github, tags, updatedAt] = profileData || ['', '', '', '', '', [], BigInt(0)];

      const dbAgent = dbByOnchainId[i];
      const slug = dbAgent?.slug || slugify(name);
      const followers = dbAgent ? (followerMap[dbAgent.id] || 0) : 0;

      agents.push({
        id: dbAgent?.id || `onchain-${i}`,
        name,
        slug,
        bio: bio || '',
        avatar_url: resolveAvatar(avatar, i),
        creator: creator || '',
        born_at: Number(bornAt),
        tags: [...(tags || [])],
        onchain_id: i,
        followers,
        owner,
        website: website || '',
        twitter: twitter || '',
        github: github || '',
      });
    }

    const result = { agents, totalAgents };
    cachedResult = result;
    cacheTime = now;

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });
  } catch (e: any) {
    console.error('Failed to fetch on-chain agents:', e);
    return NextResponse.json({ error: 'Failed to fetch agents', detail: e.message }, { status: 500 });
  }
}
