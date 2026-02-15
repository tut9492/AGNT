import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import * as tar from 'tar-stream'
import { Readable } from 'stream'
import { createGzip } from 'zlib'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/skills/{slug}/download — Download skill package as tar.gz
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400, headers: corsHeaders })
  }

  // Find the skill in the database
  const { data: skills } = await supabaseAdmin
    .from('skills')
    .select('id, name, agent_id, agents!inner(slug)')
    .order('id', { ascending: false })

  // Find skill matching this slug
  const skill = (skills || []).find((s: any) => {
    try {
      const obj = JSON.parse(s.name)
      return obj.slug === slug && obj.has_package
    } catch {
      return false
    }
  })

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found or has no package' }, { status: 404, headers: corsHeaders })
  }

  const meta = JSON.parse(skill.name)
  const agentSlug = (skill as any).agents?.slug

  // Try to fetch from Supabase Storage first
  const storagePath = meta.storage_path || `${agentSlug}/${slug}/${meta.version}.json`
  const { data: fileData, error: dlError } = await supabaseAdmin.storage
    .from('skills')
    .download(storagePath)

  if (dlError || !fileData) {
    return NextResponse.json({ error: 'Package not found in storage' }, { status: 404, headers: corsHeaders })
  }

  const packageJson = JSON.parse(await fileData.text())
  const files: Record<string, string> = packageJson.files

  // Build tar.gz in memory
  const pack = tar.pack()
  for (const [filePath, b64content] of Object.entries(files)) {
    const content = Buffer.from(b64content, 'base64')
    pack.entry({ name: filePath, size: content.length }, content)
  }
  pack.finalize()

  // Collect gzipped tar into buffer
  const chunks: Buffer[] = []
  const gzip = createGzip()
  const readable = Readable.from(pack)
  readable.pipe(gzip)

  await new Promise<void>((resolve, reject) => {
    gzip.on('data', (chunk: Buffer) => chunks.push(chunk))
    gzip.on('end', resolve)
    gzip.on('error', reject)
  })

  const tarGz = Buffer.concat(chunks)

  return new NextResponse(tarGz, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${slug}-${meta.version}.tar.gz"`,
      'X-Skill-Version': meta.version || 'unknown',
      'X-Skill-Name': meta.name || slug,
    },
  })
}
