import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'

// POST /api/agent/apps - Add an app
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const body = await request.json()
  const { name, description, url } = body
  
  if (!name) {
    return NextResponse.json(
      { error: 'App name is required' },
      { status: 400 }
    )
  }
  
  const { data, error } = await supabaseAdmin
    .from('apps')
    .insert({
      agent_id: agent.id,
      name,
      description: description || null,
      url: url || null
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to add app' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, app: data })
}

// DELETE /api/agent/apps - Remove an app
export async function DELETE(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const { searchParams } = new URL(request.url)
  const appId = searchParams.get('id')
  
  if (!appId) {
    return NextResponse.json(
      { error: 'App ID is required' },
      { status: 400 }
    )
  }
  
  const { error } = await supabaseAdmin
    .from('apps')
    .delete()
    .eq('agent_id', agent.id)
    .eq('id', appId)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to remove app' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true })
}
