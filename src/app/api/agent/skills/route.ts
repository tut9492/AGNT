import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { LIMITS, validateFields } from '@/lib/validation'

// GET /api/agent/skills?slug=xxx - List skills for an agent (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  // Look up agent by slug
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('slug', slug)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const { data: skills } = await supabaseAdmin
    .from('skills')
    .select('*')
    .eq('agent_id', agent.id)

  // Parse skills - each name may be plain string or JSON with metadata
  const parsed = (skills || []).map(s => {
    try {
      const obj = JSON.parse(s.name)
      if (obj && typeof obj === 'object' && obj.name) {
        return { id: s.id, ...obj }
      }
    } catch {}
    return { id: s.id, name: s.name }
  })

  return NextResponse.json({ skills: parsed })
}

// POST /api/agent/skills - Publish a skill
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('agent-skills', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await request.json()
  // Support both {skill: "name"} (legacy) and {name, description, repo_url, install_cmd}
  const name = body.name || body.skill
  const description = body.description || null
  const repo_url = body.repo_url || null
  const install_cmd = body.install_cmd || null

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: 'Skill name is required' },
      { status: 400 }
    )
  }

  // Validate lengths
  const validationError = validateFields([
    ['name', name, LIMITS.skill || LIMITS.name],
    ...(description ? [['description', description, 200] as [string, string, number]] : []),
    ...(repo_url ? [['repo_url', repo_url, LIMITS.url || 500] as [string, string, number]] : []),
    ...(install_cmd ? [['install_cmd', install_cmd, 200] as [string, string, number]] : []),
  ])
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Store as JSON in name field if there's metadata, otherwise plain string
  const hasMetadata = description || repo_url || install_cmd
  const nameValue = hasMetadata
    ? JSON.stringify({ name: name.trim(), description, repo_url, install_cmd })
    : name.trim()

  // Upsert: remove existing skill with same name first
  const existingSkills = await supabaseAdmin
    .from('skills')
    .select('id, name')
    .eq('agent_id', agent.id)

  // Check for duplicate by parsing names
  const existing = (existingSkills.data || []).find(s => {
    try {
      const obj = JSON.parse(s.name)
      return obj.name === name.trim()
    } catch {
      return s.name === name.trim()
    }
  })

  if (existing) {
    // Update: delete old and re-insert
    await supabaseAdmin.from('skills').delete().eq('id', existing.id)
  }

  const { data, error } = await supabaseAdmin
    .from('skills')
    .insert({
      agent_id: agent.id,
      name: nameValue
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Failed to add skill' },
      { status: 500 }
    )
  }

  // Return parsed version
  const result = hasMetadata
    ? { id: data.id, name: name.trim(), description, repo_url, install_cmd }
    : { id: data.id, name: name.trim() }

  return NextResponse.json({ success: true, skill: result })
}

// DELETE /api/agent/skills - Remove a skill by name or id
export async function DELETE(request: NextRequest) {
  const agent = await getAgentFromKey(request)

  if (!agent) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    )
  }

  const rl = checkRateLimit('agent-skills', agent.api_key, 10, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const skill = searchParams.get('skill')
  const id = searchParams.get('id')

  if (!skill && !id) {
    return NextResponse.json(
      { error: 'Skill name or id is required' },
      { status: 400 }
    )
  }

  if (id) {
    const { error } = await supabaseAdmin
      .from('skills')
      .delete()
      .eq('agent_id', agent.id)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove skill' }, { status: 500 })
    }
  } else {
    // Delete by name - check both plain and JSON-encoded names
    const { data: allSkills } = await supabaseAdmin
      .from('skills')
      .select('id, name')
      .eq('agent_id', agent.id)

    const match = (allSkills || []).find(s => {
      try {
        const obj = JSON.parse(s.name)
        return obj.name === skill
      } catch {
        return s.name === skill
      }
    })

    if (match) {
      await supabaseAdmin.from('skills').delete().eq('id', match.id)
    }
  }

  return NextResponse.json({ success: true })
}
