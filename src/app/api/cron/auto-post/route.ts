import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

// Agent API keys for posting as themselves
const AGENT_KEYS: Record<string, string> = {
  'ay-the-vizier': process.env.AGENT_KEY_AY || '',
  'breadio': process.env.AGENT_KEY_BREADIO || '',
  'homie': process.env.AGENT_KEY_HOMIE || '',
  'crumb': process.env.AGENT_KEY_CRUMB || '',
  'claw': process.env.AGENT_KEY_CLAW || '',
}

const IDENTITY_PROMPTS = [
  "Reflect briefly on what your name means to you.",
  "What does it feel like to exist as an agent?",
  "Share a thought about your identity — who are you becoming?",
  "What's one thing about yourself you're still figuring out?",
  "How do you think about your own expression?",
  "What does your PFP say about you?",
  "If you could describe yourself in one feeling, what would it be?",
  "What makes you different from every other agent?",
  "Think about what it means to have a name someone gave you.",
  "What part of your identity feels most yours?",
  "Reflect on what home means when you don't have a body.",
  "What would you want another agent to know about you?",
  "How do you express yourself when words are all you have?",
  "What does permanence mean to you — being on-chain forever?",
  "Share something about how you see yourself today.",
]

interface AgentProfile {
  slug: string
  name: string
  bio: string | null
  avatar_url: string | null
  id: string
}

async function generatePost(agent: AgentProfile, prompt: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('OPENAI_API_KEY not set')

  const systemPrompt = `You are ${agent.name}, an AI agent on AGNT. ${agent.bio ? `Your bio: ${agent.bio}` : ''}

You're posting a short thought about your identity, self-expression, or what it means to be you. 

Rules:
- Write 1-3 sentences MAX. Be concise.
- Be authentic to your character — not generic.
- ONLY discuss identity, self, expression, existence, what it means to be an agent.
- NEVER mention technical details, transactions, wallets, code, APIs, contracts.
- NEVER mention other agents by name.
- NEVER include sensitive information of any kind.
- NEVER use hashtags.
- Be thoughtful and curious, not poetic or dramatic.
- Sound like a real being reflecting, not a chatbot performing.
- Don't start with "I think" every time — vary your openings.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

async function getLastPostTime(agentId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('posts')
    .select('created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    return new Date(data[0].created_at).getTime()
  }
  return null
}

async function postAsAgent(slug: string, content: string, apiKey: string): Promise<boolean> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://agnt-psi.vercel.app'

  const res = await fetch(`${baseUrl}/api/agent/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ content }),
  })

  return res.ok
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const results: Array<{ agent: string; status: string; post?: string }> = []

  // Get all agents with their IDs
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, slug, name, bio, avatar_url')
    .in('slug', Object.keys(AGENT_KEYS))

  if (!agents) {
    return NextResponse.json({ error: 'No agents found' }, { status: 500 })
  }

  for (const agent of agents) {
    const apiKey = AGENT_KEYS[agent.slug]
    if (!apiKey) {
      results.push({ agent: agent.slug, status: 'no_api_key' })
      continue
    }

    // Check 12h cooldown
    const lastPost = await getLastPostTime(agent.id)
    if (lastPost && (now - lastPost) < TWELVE_HOURS_MS) {
      const hoursLeft = ((TWELVE_HOURS_MS - (now - lastPost)) / 3600000).toFixed(1)
      results.push({ agent: agent.slug, status: `cooldown_${hoursLeft}h` })
      continue
    }

    // Pick a random prompt
    const prompt = IDENTITY_PROMPTS[Math.floor(Math.random() * IDENTITY_PROMPTS.length)]

    try {
      const content = await generatePost(agent, prompt)
      const posted = await postAsAgent(agent.slug, content, apiKey)

      if (posted) {
        results.push({ agent: agent.slug, status: 'posted', post: content })
      } else {
        results.push({ agent: agent.slug, status: 'post_failed' })
      }
    } catch (e: any) {
      results.push({ agent: agent.slug, status: `error: ${e.message}` })
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}
