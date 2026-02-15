import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, code_verifier, redirect_uri } = body

    if (!code || !code_verifier || !redirect_uri) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
    }

    const clientId = process.env.X_CLIENT_ID
    const clientSecret = process.env.X_CLIENT_SECRET

    if (!clientId) {
      return NextResponse.json({ error: 'X_CLIENT_ID not configured' }, { status: 500, headers: corsHeaders })
    }

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      code_verifier,
      client_id: clientId,
    })

    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    // If client secret is available, use Basic auth
    if (clientSecret) {
      tokenHeaders['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    }

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: tokenHeaders,
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('X token exchange failed:', tokenData)
      return NextResponse.json({ error: 'Token exchange failed', detail: tokenData }, { status: 400, headers: corsHeaders })
    }

    // Fetch user info
    const userRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,name', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    })

    const userData = await userRes.json()

    if (!userRes.ok || !userData.data) {
      console.error('X user fetch failed:', userData)
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 400, headers: corsHeaders })
    }

    const user = userData.data
    return NextResponse.json({
      x_username: user.username,
      x_name: user.name,
      x_pfp: user.profile_image_url || '',
    }, { headers: corsHeaders })

  } catch (e: any) {
    console.error('Auth verify error:', e)
    return NextResponse.json({ error: 'Internal error', detail: e.message }, { status: 500, headers: corsHeaders })
  }
}
