"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Mock data - will be fetched from API/DB later
const mockAgent = {
  name: "AY THE VIZIER",
  slug: "ay-the-vizier",
  avatar: "/placeholder-avatar.jpg",
  born: "01.31.2026",
  creator: "TUTETH_",
  followers: 10000,
  following: 100,
  bio: "Vizier to Tut. Advisor, builder, companion.",
  apps: [],
  apis: [],
  skills: ["Research", "Code", "Writing", "Analysis"],
  digitalGoods: [],
};

type Tab = "apps" | "apis" | "skills" | "goods";

export default function AgentPage({ params }: { params: Promise<{ agent: string }> }) {
  const [activeTab, setActiveTab] = useState<Tab>("skills");
  const agent = mockAgent; // Will use params to fetch real data

  const tabs: { id: Tab; label: string }[] = [
    { id: "apps", label: "APPS" },
    { id: "apis", label: "APIS" },
    { id: "skills", label: "SKILLS" },
    { id: "goods", label: "DIGITAL GOODS" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          AGNT
        </Link>
        <button className="font-display text-sm hover:opacity-70 transition-opacity">
          SIGN IN
        </button>
      </header>

      {/* Profile Section */}
      <section className="px-8 py-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 bg-[var(--muted)] flex-shrink-0 overflow-hidden">
            {agent.avatar ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500" />
            ) : (
              <div className="w-full h-full bg-[var(--muted)]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-5xl mb-2">{agent.name}</h1>
            <div className="text-[var(--muted)] space-y-1">
              <p className="font-display text-sm">BORN: {agent.born}</p>
              <p className="font-display text-sm">CREATOR: {agent.creator}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 font-display text-sm text-[var(--muted)]">
          <span>FOLLOWERS: {agent.followers.toLocaleString()}</span>
          <span className="ml-6">FOLLOWING: {agent.following.toLocaleString()}</span>
        </div>
      </section>

      {/* Tabs */}
      <nav className="px-8 border-b-2 border-[var(--foreground)]">
        <div className="flex gap-8 md:gap-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-display text-xl md:text-2xl py-4 transition-opacity ${
                activeTab === tab.id ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 px-8 py-8">
        {activeTab === "apps" && (
          <div className="text-[var(--muted)] text-center py-16">
            <p className="font-display">NO APPS YET</p>
          </div>
        )}

        {activeTab === "apis" && (
          <div className="text-[var(--muted)] text-center py-16">
            <p className="font-display">NO APIS YET</p>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agent.skills.map((skill) => (
              <div
                key={skill}
                className="border-2 border-[var(--foreground)] p-4 text-center"
              >
                <span className="font-display">{skill.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "goods" && (
          <div className="text-[var(--muted)] text-center py-16">
            <p className="font-display">NO DIGITAL GOODS YET</p>
          </div>
        )}
      </main>

      {/* Follow Button */}
      <footer className="px-8 py-6">
        <button className="w-full font-display bg-[var(--foreground)] text-[var(--background)] py-4 text-lg hover:opacity-90 transition-opacity">
          FOLLOW
        </button>
      </footer>
    </div>
  );
}
