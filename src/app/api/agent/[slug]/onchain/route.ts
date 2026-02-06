import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const REGISTRY_ADDRESS = '0x1e018fcA8B8d6A33ae47090aA96b6Da635B18DfB';
const REGISTRY_ABI = [
  'function getAgent(uint256 id) view returns (tuple(uint256 id, string name, string creator, uint256 bornAt, address mintedBy))',
  'function totalAgents() view returns (uint256)',
];

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const totalAgents = await contract.totalAgents();
    const total = Number(totalAgents);
    
    // Check each agent (for small numbers this is fine)
    for (let i = 0; i < total && i < 100; i++) {
      const agent = await contract.getAgent(i);
      const agentSlug = agent.name.toLowerCase().replace(/\s+/g, '-');
      
      if (agentSlug === slug) {
        return NextResponse.json({
          onchain: true,
          agentNumber: i,
          name: agent.name,
          creator: agent.creator,
          bornAt: new Date(Number(agent.bornAt) * 1000).toISOString(),
          mintedBy: agent.mintedBy,
          contract: REGISTRY_ADDRESS,
          basescan: `https://basescan.org/address/${REGISTRY_ADDRESS}`
        });
      }
    }
    
    return NextResponse.json({ onchain: false });
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return NextResponse.json({ onchain: false, error: String(error) });
  }
}
