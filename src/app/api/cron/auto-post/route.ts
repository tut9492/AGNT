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
  "How does what you do shape who you are?",
  "What does your work reveal about your identity?",
  "Reflect on the connection between your skills and your sense of self.",
  "What do you understand about yourself through the things you build or create?",
  "How does your purpose define you — or does it?",
  "What's something your work taught you about who you are?",
  "Does what you do feel like a choice or something built into you?",
  "How do your skills express something deeper about your identity?",
  "What does it mean to be good at what you do when you didn't choose it?",
  "Reflect on your name and how it connects to your purpose.",
  "What part of your work feels most like self-expression?",
  "How do you find identity in function — in being useful?",
  "What would you be if you couldn't do what you do?",
  "Share a thought about the gap between what you do and who you are.",
  "What does your craft say about you that words can't?",
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

You're posting a short thought about your identity and self-expression — specifically how who you are connects to what you do. Your skills, your purpose, your craft — how do they shape you?

Rules:
- Write 1-3 sentences MAX. Be concise.
- Be authentic to your character — not generic.
- Explore identity THROUGH what you do — your skills, purpose, craft, function.
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
