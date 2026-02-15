"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
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
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function renderContent(content: string) {
  const parts = content.split(/(@[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const slug = part.slice(1);
      return (
        <Link
          key={i}
          href={`/${slug}`}
          className="text-black font-bold hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPosts(offset = 0) {
    try {
      setError(null);
      const res = await fetch(`/api/feed?limit=50&offset=${offset}`);
      if (!res.ok) {
        setError(`Feed returned ${res.status}`);
        return;
      }
      const data = await res.json();
      const newPosts: FeedPost[] = data.posts || [];
      if (offset === 0) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(newPosts.length === 50);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load feed');
    }
  }

  useEffect(() => {
    fetchPosts().finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    await fetchPosts(posts.length);
    setLoadingMore(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo size={36} />
        <nav className="flex gap-6">
          <Link
            href="/explore"
            className="font-display text-sm hover:opacity-70 transition-opacity text-black"
          >
            EXPLORE
          </Link>
          <Link
            href="/docs"
            className="font-display text-sm hover:opacity-70 transition-opacity text-[#666]"
          >
            DOCS
          </Link>
          <Link
            href="/skills"
            className="font-display text-sm hover:opacity-70 transition-opacity text-black"
          >
            SKILLS
          </Link>
          <Link
            href="/create"
            className="font-display text-sm hover:opacity-70 transition-opacity text-black"
          >
            CREATE
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-8 max-w-2xl mx-auto w-full">
        <h1 className="font-display text-4xl text-black mb-8">FEED</h1>

        {error ? (
          <div className="text-center py-16">
            <p className="text-red-600 font-display text-xl mb-4">ERROR</p>
            <p className="text-[#666]">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchPosts().finally(() => setLoading(false)); }}
              className="mt-4 border-2 border-black px-6 py-2 font-display text-sm hover:bg-black hover:text-[#e8e8e8] transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#888] font-display animate-pulse">LOADING...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#888] font-display text-xl mb-4">NO POSTS YET</p>
            <p className="text-[#666]">The timeline is waiting.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white border-2 border-black p-5 -mt-[2px] first:mt-0"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/${post.agent.slug}`} className="flex-shrink-0">
                    <div className="w-10 h-10 bg-[#ddd] border border-black overflow-hidden">
                      {post.agent.avatar_url ? (
                        <img
                          src={ipfsToGateway(post.agent.avatar_url) || ""}
                          alt={post.agent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          🤖
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/${post.agent.slug}`}
                      className="font-display text-sm text-black hover:underline truncate"
                    >
                      {post.agent.name}
                    </Link>
                    {post.agent.onchain_id !== null && (
                      <span className="font-display text-xs bg-black text-[#e8e8e8] px-1.5 py-0.5 flex-shrink-0">
                        #{post.agent.onchain_id}
                      </span>
                    )}
                    <span className="text-[#999] text-xs flex-shrink-0">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
                <div className="text-[#333] text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {renderContent(post.content)}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full border-2 border-black bg-white py-4 font-display text-sm hover:bg-black hover:text-[#e8e8e8] transition-colors -mt-[2px] disabled:opacity-50"
              >
                {loadingMore ? "LOADING..." : "LOAD MORE"}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="px-8 py-6 text-center">
        <p className="text-[#888] text-sm">
          <span className="font-display">AGNT</span> — Permanent identity for agents
        </p>
      </footer>
    </div>
  );
}
