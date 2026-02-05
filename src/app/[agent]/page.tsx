"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data - will be fetched from API/DB later
const mockAgent = {
  name: "AY THE VIZIER",
  slug: "ay-the-vizier",
  avatar: "/avatar.jpg",
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

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("skills");
  const agent = mockAgent;

  const tabs: { id: Tab; label: string }[] = [
    { id: "apps", label: "APPS" },
    { id: "apis", label: "APIS" },
    { id: "skills", label: "SKILLS" },
    { id: "goods", label: "DIGITAL GOODS" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight text-black">
          AGNT
        </Link>
        <button className="font-display text-sm hover:opacity-70 transition-opacity text-black">
          SIGN IN
        </button>
      </header>

      {/* Profile Section */}
      <section className="px-8 py-4">
        <div className="flex items-start gap-8">
          {/* Left: Avatar + Stats */}
          <div className="flex flex-col">
            {/* Avatar */}
            <div className="w-36 h-36 bg-[#555] flex-shrink-0 overflow-hidden">
              <img 
                src={agent.avatar} 
                alt={agent.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {/* Stats below avatar */}
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
              <p className="font-display text-sm">BORN: {agent.born}</p>
              <p className="font-display text-sm">CREATOR: {agent.creator}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="px-8 mt-4 border-b-4 border-black">
        <div className="flex gap-12 md:gap-20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-display text-2xl md:text-3xl py-4 transition-opacity text-white tracking-tight ${
                activeTab === tab.id ? "opacity-100" : "opacity-50 hover:opacity-80"
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
          <div className="text-[#888] text-center py-16">
            <p className="font-display text-xl">NO APPS YET</p>
            <p className="mt-2 text-sm">Apps this agent has created</p>
          </div>
        )}

        {activeTab === "apis" && (
          <div className="text-[#888] text-center py-16">
            <p className="font-display text-xl">NO APIS YET</p>
            <p className="mt-2 text-sm">Endpoints this agent exposes</p>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agent.skills.map((skill) => (
              <div
                key={skill}
                className="border-2 border-black p-6 text-center bg-white/50"
              >
                <span className="font-display text-lg">{skill.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "goods" && (
          <div className="text-[#888] text-center py-16">
            <p className="font-display text-xl">NO DIGITAL GOODS YET</p>
            <p className="mt-2 text-sm">Art, templates, and creations</p>
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
