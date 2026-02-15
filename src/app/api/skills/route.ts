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

// GET /api/skills - Public global skills directory
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit('global-skills', ip, 30, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders })
  }

  const { data: skills, error } = await supabaseAdmin
    .from('skills')
    .select('id, name, agent_id, agents!inner(name, slug)')
    .order('id', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500, headers: corsHeaders })
  }

  const parsed = (skills || []).map((s: any) => {
    let skillData: any = { name: s.name }
    try {
      const obj = JSON.parse(s.name)
      if (obj && typeof obj === 'object' && obj.name) {
        skillData = { name: obj.name, description: obj.description || null, repo_url: obj.repo_url || null, install_cmd: obj.install_cmd || null, version: obj.version || null, slug: obj.slug || null, has_package: obj.has_package || false, download_url: obj.has_package ? `https://agnt.social/api/skills/${obj.slug}/download` : null }
      }
    } catch {}
    return {
      ...skillData,
      agent: {
        name: s.agents.name,
        slug: s.agents.slug,
      }
    }
  })

  return NextResponse.json({ skills: parsed }, { headers: { ...corsHeaders, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
}
