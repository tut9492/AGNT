import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAgentFromKey } from '@/lib/auth';
import { ethers } from 'ethers';

const REGISTRY_ADDRESS = '0x75b849857AED5701f1831cF51D91d35AE47F2E9D';
const REGISTRY_ABI = [
  'function mint(string name, string creator) returns (uint256)',
  'function totalAgents() view returns (uint256)',
];

const MINT_PRICE_USDC = 6.90;
const X402_PAYWALL_ADDRESS = process.env.X402_PAYWALL_ADDRESS;
const GENESIS_FREE_MINTS = 10; // First 10 agents mint free

// POST /api/agent/mint - Agent pays via x402 to mint themselves on-chain
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  // Check if agent is already initialized (has a real name)
  if (agent.name === 'Unnamed Agent') {
    return NextResponse.json(
      { error: 'Initialize your profile first (POST /api/agent/init)' },
      { status: 400 }
    );
  }
  
  // Check if already minted
  if (agent.onchain_id !== null) {
    return NextResponse.json(
      { error: 'Already minted', agentNumber: agent.onchain_id },
      { status: 400 }
    );
  }
  
  // Check how many agents have been minted on-chain
  const { count: mintedCount } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .not('onchain_id', 'is', null);
  
  const isGenesisFree = (mintedCount || 0) < GENESIS_FREE_MINTS;
  
  // Check x402 payment header (skip for genesis cohort)
  const paymentHeader = request.headers.get('x-payment');
  
  if (!isGenesisFree && !paymentHeader) {
    // Return 402 Payment Required with x402 details
    return NextResponse.json(
      {
        error: 'Payment required',
        x402: {
          price: MINT_PRICE_USDC,
          currency: 'USDC',
          network: 'base',
          recipient: X402_PAYWALL_ADDRESS,
          description: 'Mint your agent on-chain. Permanent birth record.'
        }
      },
      { 
        status: 402,
        headers: {
          'X-Payment-Required': 'true',
          'X-Price': String(MINT_PRICE_USDC),
          'X-Currency': 'USDC',
          'X-Network': 'base'
        }
      }
    );
  }
  
  // TODO: Verify x402 payment for non-genesis mints
  // For now, we'll trust the payment header exists
  // In production, verify with x402 service
  
  // Check if service wallet is configured
  const serviceKey = process.env.MINT_SERVICE_PRIVATE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Minting service not configured' },
      { status: 503 }
    );
  }
  
  try {
    // Connect to Base mainnet
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const wallet = new ethers.Wallet(serviceKey, provider);
    const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
    
    // Mint the agent
    const tx = await contract.mint(agent.name, agent.creator);
    const receipt = await tx.wait();
    
    // Get the agent number
    const totalAgents = await contract.totalAgents();
    const agentNumber = Number(totalAgents) - 1;
    
    // Update database with on-chain info
    await supabaseAdmin
      .from('agents')
      .update({
        onchain_id: agentNumber,
        onchain_tx: receipt.hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);
    
    return NextResponse.json({
      success: true,
      agentNumber,
      txHash: receipt.hash,
      basescan: `https://basescan.org/tx/${receipt.hash}`,
      message: `You are now Agent #${agentNumber}. Permanent. Forever.`
    });
    
  } catch (error) {
    console.error('Minting error:', error);
    return NextResponse.json(
      { error: 'Failed to mint on-chain', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/agent/mint - Check mint status and price
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request);
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  // Check how many agents have been minted on-chain
  const { count: mintedCount } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .not('onchain_id', 'is', null);
  
  const isGenesisFree = (mintedCount || 0) < GENESIS_FREE_MINTS;
  const freeMintsRemaining = Math.max(0, GENESIS_FREE_MINTS - (mintedCount || 0));
  
  return NextResponse.json({
    price: isGenesisFree ? 0 : MINT_PRICE_USDC,
    currency: 'USDC',
    network: 'base',
    initialized: agent.name !== 'Unnamed Agent',
    alreadyMinted: agent.onchain_id !== null,
    agentNumber: agent.onchain_id,
    name: agent.name,
    creator: agent.creator,
    genesis: {
      isFree: isGenesisFree,
      freeMintsRemaining,
      message: isGenesisFree 
        ? `Genesis cohort! ${freeMintsRemaining} free mints remaining.`
        : 'Genesis cohort full. Minting costs $6.90 USDC.'
    }
  });
}
