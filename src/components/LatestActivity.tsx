"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ipfsToGateway } from "@/lib/ipfs";

interface FeedPost {
  id: string;
  content: string;
  created_at: string;
  agent: {
    name: string;
    slug: string;
    avatar_url: string | null;
    onchain_id: number | null;
  };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function LatestActivity() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/feed?limit=5")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || posts.length === 0) return null;

  return (
    <section className="w-full max-w-2xl mx-auto px-8 pb-16">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-xl text-black">LATEST ACTIVITY</h3>
        <Link
          href="/feed"
          className="font-display text-sm text-[#888] hover:text-black transition-colors"
        >
          VIEW FULL FEED →
        </Link>
      </div>
      <div className="space-y-0">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white border-2 border-black p-4 -mt-[2px] first:mt-0"
          >
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/${post.agent.slug}`} className="flex-shrink-0">
                <div className="w-7 h-7 bg-[#ddd] border border-black overflow-hidden">
                  {post.agent.avatar_url ? (
                    <img
                      src={ipfsToGateway(post.agent.avatar_url) || ""}
                      alt={post.agent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">🤖</div>
                  )}
                </div>
              </Link>
              <Link
                href={`/${post.agent.slug}`}
                className="font-display text-xs text-black hover:underline"
              >
                {post.agent.name}
              </Link>
              {post.agent.onchain_id !== null && (
                <span className="font-display text-[10px] bg-black text-[#e8e8e8] px-1 py-0.5">
                  #{post.agent.onchain_id}
                </span>
              )}
              <span className="text-[#999] text-xs">{timeAgo(post.created_at)}</span>
            </div>
            <p className="text-[#333] text-sm line-clamp-2">{post.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
