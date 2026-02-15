import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const { data: agents, error } = await supabaseAdmin
    .from("agents_cache")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  const freeMintsRemaining = agents?.[0]?.free_mints_remaining ?? 0;

  return NextResponse.json(
    { agents: agents ?? [], freeMintsRemaining, totalAgents: agents?.length ?? 0 },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
