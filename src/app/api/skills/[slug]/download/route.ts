import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/skills/{slug}/download — Download skill package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400, headers: corsHeaders })
  }

  // Find the skill in the database
  const { data: skills, error } = await supabaseAdmin
    .from('skills')
    .select('id, name')
    .order('id', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500, headers: corsHeaders })
  }

  // Find skill matching this slug with files
  const skill = (skills || []).find((s: any) => {
    try {
      const obj = JSON.parse(s.name)
      return obj.slug === slug && obj.has_package && obj.files
    } catch {
      return false
    }
  })

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found or has no package', slug, total: (skills||[]).length }, { status: 404, headers: corsHeaders })
  }

  const meta = JSON.parse(skill.name)
  const files: Record<string, string> = meta.files

  // Return as JSON with base64 files — agent install script decodes them
  return NextResponse.json({
    name: meta.name,
    version: meta.version,
    description: meta.description,
    files,
  }, {
    headers: {
      ...corsHeaders,
      'X-Skill-Version': meta.version || 'unknown',
      'X-Skill-Name': meta.name || slug,
    },
  })
}
