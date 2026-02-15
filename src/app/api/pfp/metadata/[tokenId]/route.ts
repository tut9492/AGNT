import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * GET /api/pfp/metadata/:tokenId
 * 
 * Returns OpenSea-compatible ERC-721 metadata JSON.
 * Reads agent info from on-chain contracts + serves Warren PFP as image.
 */

const MEGAETH_RPC = 'https://megaeth.drpc.org';
const AGENT_CORE = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF';
const AGENT_PROFILE = '0xc7fF3FF2a6053E132d942bd72539DFd69A16bAf7';
const AGENT_PFP = '0x1efc83da54AD560faB5859AC2d018A16cd59cFd7';
const WARREN_REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdStr } = await params;
    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId) || tokenId < 1) {
      return NextResponse.json({ error: 'invalid tokenId' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, 4326);
    const pfpContract = new ethers.Contract(AGENT_PFP, [
      'function tokenAgentId(uint256) view returns (uint256)',
      'function getLinkedSites(uint256) view returns (address[])',
      'function ownerOf(uint256) view returns (address)',
    ], provider);

    const coreContract = new ethers.Contract(AGENT_CORE, [
      'function agents(uint256) view returns (uint256, string, address, address, uint256, bool)',
    ], provider);

    const profileContract = new ethers.Contract(AGENT_PROFILE, [
      'function getBio(uint256) view returns (string)',
      'function getTags(uint256) view returns (string[])',
    ], provider);

    // Get agent ID from PFP token
    const agentId = Number(await pfpContract.tokenAgentId(tokenId));
    const owner = await pfpContract.ownerOf(tokenId);

    // Get agent info
    const agentData = await coreContract.agents(agentId);
    const name = agentData[1];

    // Get profile
    let bio = '';
    let tags: string[] = [];
    try {
      bio = await profileContract.getBio(agentId);
      tags = await profileContract.getTags(agentId);
    } catch {}

    // Get the linked Warren chunk address for the image
    let linkedSites: string[] = [];
    try {
      linkedSites = await pfpContract.getLinkedSites(tokenId);
    } catch {}

    // Build image URL — serve via our chunk reader endpoint
    const imageUrl = linkedSites.length > 0
      ? `https://agnt-psi.vercel.app/api/pfp/image/${tokenId}`
      : `https://agnt-psi.vercel.app/api/warren/content/${tokenId}`;

    // Build attributes
    const attributes: { trait_type: string; value: string | number }[] = [
      { trait_type: 'Agent ID', value: agentId },
      { trait_type: 'Collection', value: 'AGNT PFPs' },
    ];
    if (tags.length > 0) {
      tags.forEach(tag => {
        attributes.push({ trait_type: 'Skill', value: tag });
      });
    }

    const metadata = {
      name: `${name} — Agent #${agentId}`,
      description: bio || `Agent #${agentId} on AGNT. On-chain forever on MegaETH.`,
      image: imageUrl,
      external_url: `https://tut9492.github.io/AGNT/#agent/${agentId}`,
      attributes,
    };

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
