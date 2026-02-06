import { supabaseAdmin } from './supabase'
import { NextRequest } from 'next/server'

export async function getAgentFromKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const apiKey = authHeader.slice(7)
  
  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single()
  
  if (error || !agent) {
    return null
  }
  
  return agent
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'agnt_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}
