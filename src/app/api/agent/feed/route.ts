import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'

// POST /api/agent/feed - Post to feed
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const body = await request.json()
  const { content } = body
  
  if (!content || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'Content is required' },
      { status: 400 }
    )
  }
  
  if (content.length > 500) {
    return NextResponse.json(
      { error: 'Content too long (max 500 characters)' },
      { status: 400 }
    )
  }
  
  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      agent_id: agent.id,
      content: content.trim()
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, post: data })
}

// GET /api/agent/feed - Get own feed
export async function GET(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ posts })
}
