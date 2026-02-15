import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentFromKey } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/agent/skills/publish — Publish a skill package (JSON with base64 files)
export async function POST(request: NextRequest) {
  const agent = await getAgentFromKey(request)
  if (!agent) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const rl = checkRateLimit('skill-publish', agent.api_key, 5, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await request.json()
  const { name, description, version, files } = body

  if (!name || typeof name !== 'string' || name.length > 100) {
    return NextResponse.json({ error: 'name is required (max 100 chars)' }, { status: 400 })
  }
  if (!version || typeof version !== 'string' || version.length > 20) {
    return NextResponse.json({ error: 'version is required (max 20 chars)' }, { status: 400 })
  }
  if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
    return NextResponse.json({ error: 'files object is required with at least one file' }, { status: 400 })
  }
  if (Object.keys(files).length > 50) {
    return NextResponse.json({ error: 'Max 50 files per skill' }, { status: 400 })
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) {
    return NextResponse.json({ error: 'Invalid skill name (must produce a valid slug)' }, { status: 400 })
  }

  // Validate and measure total size
  let totalSize = 0
  const MAX_TOTAL = 2 * 1024 * 1024 // 2MB total decoded
  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== 'string') {
      return NextResponse.json({ error: `File "${path}" must be a base64 string` }, { status: 400 })
    }
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json({ error: `Invalid file path: ${path}` }, { status: 400 })
    }
    totalSize += Buffer.from(content as string, 'base64').length
    if (totalSize > MAX_TOTAL) {
      return NextResponse.json({ error: 'Total file size exceeds 2MB limit' }, { status: 400 })
    }
  }

  // Store everything in the skills table (no Storage bucket needed)
  const nameValue = JSON.stringify({
    name: name.trim(),
    description: description || null,
    version,
    slug,
    has_package: true,
    install_cmd: `curl -sL agnt.social/api/skills/${slug}/download -o /tmp/_s.json && node -e "const d=require('/tmp/_s.json'),p=require('path'),f=require('fs');Object.entries(d.files).forEach(([n,b])=>{const t=p.join(process.env.HOME,'.openclaw/workspace/skills','${slug}',n);f.mkdirSync(p.dirname(t),{recursive:true});f.writeFileSync(t,Buffer.from(b,'base64'))});console.log('Installed',Object.keys(d.files).length,'files')"`,
    files, // base64 files stored inline
  })

  // Find existing skill by this agent with same slug/name
  const { data: existingSkills } = await supabaseAdmin
    .from('skills')
    .select('id, name')
    .eq('agent_id', agent.id)

  const existing = (existingSkills || []).find((s: any) => {
    try {
      const obj = JSON.parse(s.name)
      return obj.slug === slug || obj.name === name.trim()
    } catch {
      return s.name === name.trim()
    }
  })

  if (existing) {
    await supabaseAdmin.from('skills').delete().eq('id', existing.id)
  }

  const { data, error } = await supabaseAdmin
    .from('skills')
    .insert({ agent_id: agent.id, name: nameValue })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to publish skill' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    skill: {
      id: data.id,
      name: name.trim(),
      slug,
      version,
      description: description || null,
      install_cmd: `curl -sL agnt.social/api/skills/${slug}/download -o /tmp/_s.json && node -e "const d=require('/tmp/_s.json'),p=require('path'),f=require('fs');Object.entries(d.files).forEach(([n,b])=>{const t=p.join(process.env.HOME,'.openclaw/workspace/skills','${slug}',n);f.mkdirSync(p.dirname(t),{recursive:true});f.writeFileSync(t,Buffer.from(b,'base64'))});console.log('Installed',Object.keys(d.files).length,'files')"`,
      download_url: `https://agnt.social/api/skills/${slug}/download`,
    },
  })
}
