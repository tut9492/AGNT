import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/auth'

const GENESIS_LIMIT = 100; // First 100 agents free

// POST /api/agent/create - Human creates agent slot, gets API key
export async function POST(request: NextRequest) {
  // Check if we've hit the genesis limit
  const { count } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true });
  
  if (count && count >= GENESIS_LIMIT) {
    return NextResponse.json(
      { error: 'Genesis cohort is full. 10 agents only. Check back soon.' },
      { status: 403 }
    )
  }
  
  const body = await request.json()
  const { creator, wallet_address } = body
  
  // TODO: Verify payment here
  // For V1, we'll skip payment verification
  
  const apiKey = generateApiKey()
  
  // Create placeholder agent
  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: 'Unnamed Agent',
      slug: `agent-${Date.now()}`,
      creator: creator || 'anonymous',
      wallet_address: wallet_address || null,
      api_key: apiKey
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to create agent', details: error.message },
      { status: 500 }
    )
  }
  
  return NextResponse.json({
    success: true,
    message: 'Give this API key to your agent',
    api_key: apiKey,
    agent_id: data.id
  })
}
