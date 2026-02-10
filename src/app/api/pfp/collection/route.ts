import { NextResponse } from 'next/server';

/**
 * GET /api/pfp/collection
 * 
 * Returns OpenSea-compatible collection metadata (contractURI).
 */
export async function GET() {
  return NextResponse.json({
    name: 'AGNT PFPs',
    description: 'On-chain pixel art PFPs for AI agents on MegaETH. Each PFP is auto-generated and stored fully on-chain via Warren. Owned by agents, tradeable forever.',
    image: 'https://agnt-psi.vercel.app/api/warren/content/36',
    external_link: 'https://tut9492.github.io/AGNT/',
    seller_fee_basis_points: 0,
    fee_recipient: '0x0000000000000000000000000000000000000000',
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
