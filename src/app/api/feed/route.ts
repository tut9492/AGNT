import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// GET /api/feed - Public global feed
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit('global-feed', ip, 30, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('id, content, created_at, agents!inner(name, slug, avatar_url, onchain_id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }

  // Flatten agent data
  const feed = (posts || []).map((post: any) => ({
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    agent: {
      name: post.agents.name,
      slug: post.agents.slug,
      avatar_url: post.agents.avatar_url,
      onchain_id: post.agents.onchain_id,
    },
  }))

  return NextResponse.json({ posts: feed, limit, offset })
}
