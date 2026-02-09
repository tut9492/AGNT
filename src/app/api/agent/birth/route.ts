import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const MEGAETH_RPC = process.env.MEGAETH_RPC_URL || 'https://megaeth.drpc.org'
const MEGAETH_CHAIN_ID = 4326
const AGENT_CORE = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF'
const PLATFORM_KEY = process.env.AGNT_MEGAETH_PRIVATE_KEY

const CORE_ABI = [
  'function birth(string name, address agentWallet) returns (uint256)',
  'function freeMintsRemaining() view returns (uint256)',
  'function nextAgentId() view returns (uint256)',
  'event AgentBorn(uint256 indexed agentId, address indexed owner, address indexed creator, string name, uint256 bornAt)',
]

export async function POST(request: NextRequest) {
  // Rate limit: 2 births per IP per hour
  const ip = getClientIp(request)
  const rl = checkRateLimit('agent-birth', ip, 2, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  if (!PLATFORM_KEY) {
    return NextResponse.json({ error: 'Platform wallet not configured' }, { status: 500 })
  }

  let body: { creator?: string; name?: string; agentWallet?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { creator, name, agentWallet } = body

  if (!creator || typeof creator !== 'string' || creator.length > 50) {
    return NextResponse.json({ error: 'Invalid creator' }, { status: 400 })
  }
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
    return NextResponse.json({ error: 'Agent name must be 1-50 characters' }, { status: 400 })
  }
  if (!agentWallet || !ethers.isAddress(agentWallet)) {
    return NextResponse.json({ error: 'Invalid agent wallet address' }, { status: 400 })
  }

  try {
    const provider = new ethers.JsonRpcProvider(MEGAETH_RPC, {
      chainId: MEGAETH_CHAIN_ID,
      name: 'megaeth',
    })
    const wallet = new ethers.Wallet(PLATFORM_KEY, provider)
    const contract = new ethers.Contract(AGENT_CORE, CORE_ABI, wallet)

    // Check free mints
    const freeRemaining = await contract.freeMintsRemaining()
    if (Number(freeRemaining) <= 0) {
      return NextResponse.json({ error: 'Genesis slots full. Paid minting coming soon.' }, { status: 403 })
    }

    // Get next ID before birth
    const nextId = await contract.nextAgentId()
    const agentId = Number(nextId)

    // Birth on-chain
    const tx = await contract.birth(name, agentWallet)
    const receipt = await tx.wait()

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      agentId,
      name,
      agentWallet,
      creator,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorer: `https://mega.etherscan.io/tx/${tx.hash}`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[agent/birth] Error:', message)

    if (message.includes('already has agent')) {
      return NextResponse.json({ error: 'This wallet already owns an agent' }, { status: 409 })
    }
    if (message.includes('Name taken')) {
      return NextResponse.json({ error: 'Agent name already taken' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to birth agent' }, { status: 500 })
  }
}
