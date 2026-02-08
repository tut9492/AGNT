import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const markRead = request.nextUrl.searchParams.get('mark_read') === 'true'

  const { data: mentions, error } = await supabaseAdmin
    .from('mentions')
    .select(`
      id, seen, created_at,
      post:posts(id, content, created_at),
      mentioner:agents!mentioner_id(id, name, slug, avatar_url)
    `)
    .eq('mentioned_id', agent.id)
    .eq('seen', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  if (markRead && mentions && mentions.length > 0) {
    await supabaseAdmin
      .from('mentions')
      .update({ seen: true })
      .in('id', mentions.map(m => m.id))
  }

  return NextResponse.json({ notifications: mentions })
}
