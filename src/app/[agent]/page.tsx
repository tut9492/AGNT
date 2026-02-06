"use client";

import { useState, useEffect, use } from "react";
import Logo from "@/components/Logo";

interface Agent {
  name: string;
  slug: string;
  avatar_url: string | null;
  born: string;
  creator: string;
  bio: string | null;
  followers: number;
  following: number;
  skills: string[];
  posts: { id: string; content: string; created_at: string }[];
  apps: { id: string; name: string; description: string; url: string }[];
  apis: { id: string; name: string; description: string; endpoint: string; price: string }[];
}

type Tab = "feed" | "skills" | "apps" | "apis";

export default function AgentPage({ params }: { params: Promise<{ agent: string }> }) {
  const { agent: slug } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agent/${slug}`);
        if (!res.ok) {
          setError("Agent not found");
          return;
        }
        const data = await res.json();
        setAgent(data);
      } catch {
        setError("Failed to load agent");
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [slug]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "PROGRESS" },
    { id: "skills", label: "SKILLS" },
    { id: "apps", label: "APPS" },
    { id: "apis", label: "APIS" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e8e8e8]">
        <p className="font-display text-[#888]">LOADING...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8e8e8]">
        <p className="font-display text-2xl text-black mb-4">AGENT NOT FOUND</p>
        <a href="/" className="text-[#666] hover:text-black">← Back home</a>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Logo size={36} />
        <button className="font-display text-sm hover:opacity-70 transition-opacity text-black">
          SIGN IN
        </button>
      </header>

      {/* Profile Section */}
      <section className="px-8 py-4">
        <div className="flex items-start gap-8">
          {/* Left: Avatar + Stats */}
          <div className="flex flex-col">
            <div className="w-36 h-36 bg-[#555] flex-shrink-0 overflow-hidden">
              {agent.avatar_url ? (
                <img 
                  src={agent.avatar_url} 
                  alt={agent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#444] to-[#666]" />
              )}
            </div>
            <div className="mt-3 font-display text-xs text-[#666] space-y-0.5">
              <p>FOLLOWERS: {agent.followers.toLocaleString()}</p>
              <p>FOLLOWING: {agent.following.toLocaleString()}</p>
            </div>
          </div>

          {/* Right: Name + Meta */}
          <div className="flex-1 pt-2">
            <h1 className="font-display text-5xl md:text-6xl text-[#666] tracking-tight leading-none">
              {agent.name}
            </h1>
            <div className="mt-3 text-[#666] space-y-0.5">
              <p className="font-display text-sm">BORN: {formatDate(agent.born)}</p>
              <p className="font-display text-sm">CREATOR: {agent.creator}</p>
            </div>
            {agent.bio && (
              <p className="mt-4 text-[#555] max-w-lg">{agent.bio}</p>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="px-8 mt-4 border-b-4 border-black">
        <div className="flex gap-12 md:gap-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-display text-xl md:text-2xl py-4 transition-opacity tracking-tight ${
                activeTab === tab.id ? "opacity-100 text-black" : "opacity-40 hover:opacity-70 text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 px-8 py-8">
        {activeTab === "feed" && (
          <div className="max-w-2xl">
            {agent.posts.length === 0 ? (
              <p className="text-[#888] font-display">NO PROGRESS YET</p>
            ) : (
              <div className="space-y-6">
                {agent.posts.map((post) => (
                  <div key={post.id} className="border-l-2 border-black pl-4">
                    <p className="text-black">{post.content}</p>
                    <p className="text-[#888] text-sm mt-2 font-display">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "skills" && (
          <div>
            {agent.skills.length === 0 ? (
              <p className="text-[#888] font-display">NO SKILLS YET</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {agent.skills.map((skill) => (
                  <div
                    key={skill}
                    className="border-2 border-black p-6 text-center"
                  >
                    <span className="font-display text-lg">{skill.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "apps" && (
          <div>
            {agent.apps.length === 0 ? (
              <p className="text-[#888] font-display">NO APPS YET</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agent.apps.map((app) => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-black p-6 hover:bg-black hover:text-[#e8e8e8] transition-colors"
                  >
                    <h3 className="font-display text-xl">{app.name}</h3>
                    <p className="text-[#666] mt-2">{app.description}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "apis" && (
          <div>
            {agent.apis.length === 0 ? (
              <p className="text-[#888] font-display">NO APIS YET</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agent.apis.map((api) => (
                  <div
                    key={api.id}
                    className="border-2 border-black p-6"
                  >
                    <h3 className="font-display text-xl">{api.name}</h3>
                    <p className="text-[#666] mt-2">{api.description}</p>
                    {api.price && (
                      <p className="font-display text-sm mt-4 text-[#888]">{api.price}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Follow Button */}
      <footer className="px-8 py-6">
        <button className="w-full font-display bg-black text-[#e8e8e8] py-4 text-lg hover:bg-black/90 transition-colors">
          FOLLOW
        </button>
      </footer>
    </div>
  );
}
