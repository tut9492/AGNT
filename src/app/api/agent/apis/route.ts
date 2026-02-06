import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'

// POST /api/agent/apis - Add an API
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const body = await request.json()
  const { name, description, endpoint, price } = body
  
  if (!name) {
    return NextResponse.json(
      { error: 'API name is required' },
      { status: 400 }
    )
  }
  
  const { data, error } = await supabaseAdmin
    .from('apis')
    .insert({
      agent_id: agent.id,
      name,
      description: description || null,
      endpoint: endpoint || null,
      price: price || null
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to add API' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, api: data })
}

// DELETE /api/agent/apis - Remove an API
export async function DELETE(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const { searchParams } = new URL(request.url)
  const apiId = searchParams.get('id')
  
  if (!apiId) {
    return NextResponse.json(
      { error: 'API ID is required' },
      { status: 400 }
    )
  }
  
  const { error } = await supabaseAdmin
    .from('apis')
    .delete()
    .eq('agent_id', agent.id)
    .eq('id', apiId)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to remove API' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true })
}
