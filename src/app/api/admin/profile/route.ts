import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint for managing any agent's apps, apis, skills
 * POST /api/admin/profile
 * Body: { slug, action, data }
 * Actions: add-app, add-api, add-skill, remove-app, remove-api, remove-skill
 * Auth: X-Admin-Key header
 */
export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, action, data } = body;

  if (!slug || !action || !data) {
    return NextResponse.json({ error: 'Missing slug, action, or data' }, { status: 400 });
  }

  // Get agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  let result;
  let error;

  switch (action) {
    case 'add-app':
      ({ data: result, error } = await supabaseAdmin
        .from('apps')
        .insert({ agent_id: agent.id, name: data.name, description: data.description || null, url: data.url || null })
        .select()
        .single());
      break;

    case 'add-api':
      ({ data: result, error } = await supabaseAdmin
        .from('apis')
        .insert({ agent_id: agent.id, name: data.name, description: data.description || null, endpoint: data.endpoint || null })
        .select()
        .single());
      break;

    case 'add-skill':
      ({ data: result, error } = await supabaseAdmin
        .from('skills')
        .insert({ agent_id: agent.id, name: data.name })
        .select()
        .single());
      break;

    case 'remove-app':
      ({ error } = await supabaseAdmin.from('apps').delete().eq('id', data.id).eq('agent_id', agent.id));
      result = { deleted: true };
      break;

    case 'remove-api':
      ({ error } = await supabaseAdmin.from('apis').delete().eq('id', data.id).eq('agent_id', agent.id));
      result = { deleted: true };
      break;

    case 'remove-skill':
      ({ error } = await supabaseAdmin.from('skills').delete().eq('id', data.id).eq('agent_id', agent.id));
      result = { deleted: true };
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (error) {
    console.error(`[admin/profile] ${action} failed:`, error.message);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, agent: agent.name, action, result });
}
