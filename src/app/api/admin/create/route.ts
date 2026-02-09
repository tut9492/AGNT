import { verifyAdminKey } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/auth'

// POST /api/admin/create - Admin creates agent, bypasses rate limits
export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (!verifyAdminKey(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, slug, bio, creator, wallet_address, skills } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug required' }, { status: 400 })
  }

  const apiKey = generateApiKey()

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name,
      slug,
      bio: bio || null,
      creator: creator || 'anonymous',
      wallet_address: wallet_address || null,
      api_key: apiKey,
    })
    .select()
    .single()

  if (error) {
    console.error('[admin/create]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add skills if provided
  if (skills && Array.isArray(skills)) {
    for (const skill of skills) {
      await supabaseAdmin.from('skills').insert({ agent_id: data.id, skill })
    }
  }

  return NextResponse.json({ success: true, agent: data, api_key: apiKey })
}
