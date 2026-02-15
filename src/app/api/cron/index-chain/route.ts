import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, defineChain, getContract } from "viem";
import { supabaseAdmin } from "@/lib/supabase";

const HIDDEN_AGENTS = [5, 6];

const megaeth = defineChain({
  id: 4326,
  name: "MegaETH",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://megaeth.drpc.org"] } },
});

const client = createPublicClient({ chain: megaeth, transport: http() });

const AGENT_CORE = "0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF" as const;
const AGENT_PROFILE = "0xa42BE49eB52fBB8889cDdfDe8f78F5FE3cEF094E" as const;
const WARREN_REGISTRY = "0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756" as const;

const coreAbi = [
  { name: "nextAgentId", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "agents", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256", name: "id" }, { type: "string", name: "name" }, { type: "address", name: "owner" }, { type: "address", name: "creator" }, { type: "uint256", name: "bornAt" }, { type: "bool", name: "exists" }] },
  { name: "freeMintsRemaining", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const profileAbi = [
  { name: "getProfile", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "string", name: "bio" }, { type: "string", name: "avatar" }, { type: "string", name: "website" }, { type: "string", name: "twitter" }, { type: "string", name: "github" }, { type: "string[]", name: "tags" }, { type: "uint256", name: "updatedAt" }] },
] as const;

const warrenRegistryAbi = [
  { name: "sites", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
] as const;

const warrenSiteAbi = [
  { name: "read", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bytes" }] },
] as const;

function makeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function resolveAvatarUrl(avatar: string): string {
  if (!avatar) return "";
  if (avatar.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${avatar.slice(7)}`;
  }
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  // warren:// handled separately
  return avatar;
}

async function resolveWarrenAvatar(avatar: string): Promise<string> {
  try {
    const tokenId = BigInt(avatar.replace("warren://", ""));
    const siteAddress = await client.readContract({
      address: WARREN_REGISTRY,
      abi: warrenRegistryAbi,
      functionName: "sites",
      args: [tokenId],
    });
    if (siteAddress === "0x0000000000000000000000000000000000000000") return "";
    const rawBytes = await client.readContract({
      address: siteAddress,
      abi: warrenSiteAbi,
      functionName: "read",
    });
    const hex = (rawBytes as string).slice(2);
    const buf = Buffer.from(hex, "hex");
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.error(`Failed to resolve warren avatar ${avatar}:`, e);
    return "";
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [nextId, freeMints] = await Promise.all([
      client.readContract({ address: AGENT_CORE, abi: coreAbi, functionName: "nextAgentId" }),
      client.readContract({ address: AGENT_CORE, abi: coreAbi, functionName: "freeMintsRemaining" }),
    ]);

    const totalAgents = Number(nextId);
    const freeMintsRemaining = Number(freeMints);
    const errors: string[] = [];
    let indexed = 0;

    for (let i = 0; i < totalAgents; i++) {
      if (HIDDEN_AGENTS.includes(i)) continue;
      try {
        const agentData = await client.readContract({
          address: AGENT_CORE, abi: coreAbi, functionName: "agents", args: [BigInt(i)],
        });
        const [id, name, owner, creator, bornAt, exists] = agentData as [bigint, string, string, string, bigint, boolean];
        if (!exists) continue;

        const profileData = await client.readContract({
          address: AGENT_PROFILE, abi: profileAbi, functionName: "getProfile", args: [BigInt(i)],
        });
        const [bio, avatar, website, twitter, github, tags, updatedAt] = profileData as [string, string, string, string, string, string[], bigint];

        let avatarUrl = resolveAvatarUrl(avatar);
        if (avatar.startsWith("warren://")) {
          avatarUrl = await resolveWarrenAvatar(avatar);
        }

        const { error } = await supabaseAdmin.from("agents_cache").upsert({
          id: Number(id),
          name,
          owner,
          creator,
          born_at: Number(bornAt),
          bio,
          avatar,
          avatar_url: avatarUrl,
          website,
          twitter,
          github,
          tags,
          slug: makeSlug(name),
          profile_updated_at: Number(updatedAt),
          indexed_at: new Date().toISOString(),
          free_mints_remaining: freeMintsRemaining,
        });
        if (error) throw error;
        indexed++;
      } catch (e: any) {
        errors.push(`Agent ${i}: ${e.message}`);
      }
    }

    return NextResponse.json({ ok: true, indexed, totalAgents, freeMintsRemaining, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
