import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * GET /api/pfp/image/:tokenId
 * 
 * Reads PFP image bytes from the Warren chunk linked to the AgentPFP NFT.
 * Returns raw PNG.
 */

const MEGAETH_RPC = 'https://megaeth.drpc.org';
const AGENT_PFP = '0x3566B44f7c77ec8F6b54862e7C4a8Ba480F71E0f';

export async function GET(
  req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = parseInt(params.tokenId);
    if (isNaN(tokenId) || tokenId < 1) {
      return new NextResponse('invalid tokenId', { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, 4326);
    const pfpContract = new ethers.Contract(AGENT_PFP, [
      'function getLinkedSites(uint256) view returns (address[])',
    ], provider);

    const linkedSites = await pfpContract.getLinkedSites(tokenId);
    if (!linkedSites || linkedSites.length === 0) {
      return new NextResponse('no linked site', { status: 404 });
    }

    // Read raw bytes from the Warren chunk contract
    const chunkContract = new ethers.Contract(linkedSites[0], [
      'function read() view returns (bytes)',
    ], provider);

    const data = await chunkContract.read();
    const imageBytes = ethers.getBytes(data);

    return new NextResponse(imageBytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
