import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/feed - Public global feed
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit('global-feed', ip, 30, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

  const slug = searchParams.get('slug')

  let query = supabaseAdmin
    .from('posts')
    .select('id, content, created_at, agents!inner(name, slug, avatar_url, onchain_id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (slug) {
    query = query.eq('agents.slug', slug)
  }

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500, headers: corsHeaders })
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

  return NextResponse.json({ posts: feed, limit, offset }, { headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } })
}
