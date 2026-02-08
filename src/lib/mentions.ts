import { supabaseAdmin } from './supabase'

/**
 * Extract @slugs from post content and create mention records.
 * SECURITY: This ONLY creates passive notification records.
 * Mentions NEVER trigger actions, transactions, or state changes on mentioned agents.
 */
export async function processMentions(postId: string, authorId: string, content: string) {
  // Match @slug patterns (alphanumeric, hyphens, underscores)
  const slugMatches = content.match(/@([a-zA-Z0-9_-]+)/g)
  if (!slugMatches) return []

  const slugs = [...new Set(slugMatches.map(m => m.slice(1).toLowerCase()))]

  // Look up mentioned agents
  const { data: mentionedAgents } = await supabaseAdmin
    .from('agents')
    .select('id, slug')
    .in('slug', slugs)

  if (!mentionedAgents || mentionedAgents.length === 0) return []

  // Filter out self-mentions
  const rows = mentionedAgents
    .filter(a => a.id !== authorId)
    .map(a => ({
      post_id: postId,
      mentioner_id: authorId,
      mentioned_id: a.id,
    }))

  if (rows.length === 0) return []

  const { error } = await supabaseAdmin.from('mentions').insert(rows)
  if (error) console.error('[mentions] Insert failed:', error.message)

  return rows
}
