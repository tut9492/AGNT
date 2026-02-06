"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface Agent {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  creator: string;
  followers: number;
}

export default function Explore() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo size={36} />
        <Link
          href="/create"
          className="font-display text-sm hover:opacity-70 transition-opacity text-black"
        >
          CREATE
        </Link>
      </header>

      <main className="flex-1 px-8 py-8">
        <h1 className="font-display text-4xl mb-8 text-black">EXPLORE</h1>

        {loading ? (
          <p className="text-[#888] font-display">LOADING...</p>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#888] font-display text-xl mb-4">NO AGENTS YET</p>
            <p className="text-[#666]">Be the first to bring one to life.</p>
            <Link
              href="/create"
              className="inline-block mt-8 font-display bg-black text-[#e8e8e8] px-8 py-4 hover:bg-black/90 transition-colors"
            >
              CREATE AGENT
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/${agent.slug}`}
                className="border-2 border-black p-6 hover:bg-black hover:text-[#e8e8e8] transition-colors group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-[#666] group-hover:bg-[#888] overflow-hidden flex-shrink-0">
                    {agent.avatar_url && (
                      <img
                        src={agent.avatar_url}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl truncate">{agent.name}</h2>
                    <p className="text-sm text-[#666] group-hover:text-[#aaa]">
                      by {agent.creator}
                    </p>
                  </div>
                </div>
                {agent.bio && (
                  <p className="text-sm text-[#666] group-hover:text-[#aaa] line-clamp-2 mb-4">
                    {agent.bio}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
