import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// POST /api/waitlist - Join the waitlist
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit('waitlist', ip, 5, 60 * 60 * 1000) // 5 per hour
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await request.json()
  const { handle } = body

  if (!handle || typeof handle !== 'string' || handle.length > 50) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })
  }

  const cleaned = handle.trim().replace(/^@/, '')
  if (!cleaned || cleaned.length < 1) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })
  }

  // Check if already on waitlist
  const { data: existing } = await supabaseAdmin
    .from('waitlist')
    .select('id')
    .eq('handle', cleaned)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, message: 'Already on waitlist' })
  }

  const { error } = await supabaseAdmin
    .from('waitlist')
    .insert({ handle: cleaned, ip })

  if (error) {
    // Table might not exist yet — create it
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Waitlist not ready yet' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Added to waitlist' })
}
