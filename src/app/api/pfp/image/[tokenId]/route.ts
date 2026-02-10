import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * GET /api/pfp/image/:tokenId
 * 
 * Reads PFP image for an AgentPFP NFT.
 * 1. Try linked Warren site on the NFT contract
 * 2. Fallback: read agent's on-chain avatar (warren://) from AgentProfile
 */

const MEGAETH_RPC = 'https://megaeth.drpc.org';
const AGENT_PFP = '0x1efc83da54AD560faB5859AC2d018A16cd59cFd7';
const AGENT_PROFILE = '0x30Bb372F5771F40E0215c4Dcc6615036B3359510';
const WARREN_REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756';

const IMAGE_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Access-Control-Allow-Origin': '*',
};

async function readWarrenChunk(provider: ethers.JsonRpcProvider, siteAddr: string): Promise<Buffer | null> {
  try {
    const chunk = new ethers.Contract(siteAddr, ['function read() view returns (bytes)'], provider);
    const data = await chunk.read();
    return Buffer.from(ethers.getBytes(data));
  } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdStr } = await params;
    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId) || tokenId < 1) {
      return new NextResponse('invalid tokenId', { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, 4326);

    // Method 1: Check linked sites on the NFT
    const pfpContract = new ethers.Contract(AGENT_PFP, [
      'function getLinkedSites(uint256) view returns (address[])',
      'function agentIds(uint256) view returns (uint256)',
    ], provider);

    const linkedSites = await pfpContract.getLinkedSites(tokenId);
    if (linkedSites && linkedSites.length > 0) {
      const imageBytes = await readWarrenChunk(provider, linkedSites[0]);
      if (imageBytes) return new NextResponse(imageBytes, { headers: IMAGE_HEADERS });
    }

    // Method 2: Look up the agent's on-chain avatar via AgentProfile
    // The NFT stores which agentId it belongs to
    let agentId: number;
    try {
      agentId = Number(await pfpContract.agentIds(tokenId));
    } catch {
      // Fallback: assume tokenId roughly maps to agentId (token 1 = agent 0, etc.)
      agentId = tokenId - 1;
    }

    const profileContract = new ethers.Contract(AGENT_PROFILE, [
      'function profiles(uint256) view returns (string bio, string avatar, string website, string twitter, string github)',
    ], provider);

    const profile = await profileContract.profiles(agentId);
    const avatar = profile[1]; // avatar field

    if (avatar && avatar.startsWith('warren://')) {
      const warrenTokenId = parseInt(avatar.slice(9));
      const warrenRegistry = new ethers.Contract(WARREN_REGISTRY, [
        'function sites(uint256) view returns (address)',
      ], provider);

      const siteAddr = await warrenRegistry.sites(warrenTokenId);
      if (siteAddr && siteAddr !== ethers.ZeroAddress) {
        const imageBytes = await readWarrenChunk(provider, siteAddr);
        if (imageBytes) return new NextResponse(imageBytes, { headers: IMAGE_HEADERS });
      }
    }

    return new NextResponse('no image found', { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
