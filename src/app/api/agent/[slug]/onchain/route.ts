import { NextRequest, NextResponse } from 'next/server';

const REGISTRY_ADDRESS = '0x1e018fcA8B8d6A33ae47090aA96b6Da635B18DfB';

// Simple fetch to Base RPC to get on-chain agent data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  // For now, we'll check by iterating through agents
  // In production, we'd want an indexer or The Graph
  
  try {
    const response = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: REGISTRY_ADDRESS,
          data: '0x18160ddd' // totalAgents()
        }, 'latest'],
        id: 1
      })
    });
    
    const data = await response.json();
    const totalAgents = parseInt(data.result, 16);
    
    // Check each agent (for small numbers this is fine)
    for (let i = 0; i < totalAgents && i < 100; i++) {
      const agentData = await getAgentById(i);
      if (agentData && agentData.name.toLowerCase().replace(/\s+/g, '-') === slug) {
        return NextResponse.json({
          onchain: true,
          agentNumber: i,
          name: agentData.name,
          creator: agentData.creator,
          bornAt: agentData.bornAt,
          mintedBy: agentData.mintedBy,
          contract: REGISTRY_ADDRESS,
          basescan: `https://basescan.org/address/${REGISTRY_ADDRESS}`
        });
      }
    }
    
    return NextResponse.json({ onchain: false });
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return NextResponse.json({ onchain: false });
  }
}

async function getAgentById(id: number) {
  // Encode getAgent(uint256) call
  const functionSelector = '0x2a4e0f89'; // getAgent(uint256)
  const paddedId = id.toString(16).padStart(64, '0');
  
  const response = await fetch('https://mainnet.base.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: REGISTRY_ADDRESS,
        data: functionSelector + paddedId
      }, 'latest'],
      id: 1
    })
  });
  
  const data = await response.json();
  
  if (!data.result || data.result === '0x') return null;
  
  try {
    // Decode the response (simplified - assumes fixed structure)
    const hex = data.result.slice(2);
    
    // Parse the tuple: (uint256 id, string name, string creator, uint256 bornAt, address mintedBy)
    const agentId = parseInt(hex.slice(0, 64), 16);
    
    // String offsets and parsing
    const nameOffset = parseInt(hex.slice(64, 128), 16) * 2;
    const creatorOffset = parseInt(hex.slice(128, 192), 16) * 2;
    const bornAt = parseInt(hex.slice(192, 256), 16);
    const mintedBy = '0x' + hex.slice(280, 320);
    
    // Parse name string
    const nameLength = parseInt(hex.slice(nameOffset, nameOffset + 64), 16);
    const nameHex = hex.slice(nameOffset + 64, nameOffset + 64 + nameLength * 2);
    const name = Buffer.from(nameHex, 'hex').toString('utf8');
    
    // Parse creator string
    const creatorLength = parseInt(hex.slice(creatorOffset, creatorOffset + 64), 16);
    const creatorHex = hex.slice(creatorOffset + 64, creatorOffset + 64 + creatorLength * 2);
    const creator = Buffer.from(creatorHex, 'hex').toString('utf8');
    
    return {
      id: agentId,
      name,
      creator,
      bornAt: new Date(bornAt * 1000).toISOString(),
      mintedBy
    };
  } catch {
    return null;
  }
}
