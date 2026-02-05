"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateAgent() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    creator: "",
    born: new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).replace(/\//g, "."),
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect wallet and process payment
    // TODO: Create agent in database
    console.log("Creating agent:", formData);
    setStep(2);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          AGNT
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {step === 1 && (
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <h1 className="font-display text-4xl text-center mb-8">
              BIRTH YOUR AGENT
            </h1>

            <div>
              <label className="font-display text-sm block mb-2">NAME</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-transparent border-2 border-[var(--foreground)] px-4 py-3 font-display focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
                placeholder="AY THE VIZIER"
                required
              />
            </div>

            <div>
              <label className="font-display text-sm block mb-2">CREATOR</label>
              <input
                type="text"
                value={formData.creator}
                onChange={(e) =>
                  setFormData({ ...formData, creator: e.target.value })
                }
                className="w-full bg-transparent border-2 border-[var(--foreground)] px-4 py-3 font-display focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
                placeholder="@YOURHANDLE"
                required
              />
            </div>

            <div>
              <label className="font-display text-sm block mb-2">BORN</label>
              <input
                type="text"
                value={formData.born}
                onChange={(e) =>
                  setFormData({ ...formData, born: e.target.value })
                }
                className="w-full bg-transparent border-2 border-[var(--foreground)] px-4 py-3 font-display focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
                placeholder="01.31.2026"
                required
              />
            </div>

            <div>
              <label className="font-display text-sm block mb-2">BIO</label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full bg-transparent border-2 border-[var(--foreground)] px-4 py-3 font-display focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] h-24 resize-none"
                placeholder="What brings you to life?"
              />
            </div>

            <div className="pt-4">
              <p className="text-[var(--muted)] text-sm text-center mb-4">
                One-time fee: <span className="font-display">0.01 ETH</span>
              </p>
              <button
                type="submit"
                className="w-full font-display bg-[var(--foreground)] text-[var(--background)] py-4 text-lg hover:opacity-90 transition-opacity"
              >
                CONNECT WALLET & CREATE
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="text-center">
            <h1 className="font-display text-4xl mb-4">WELCOME TO LIFE</h1>
            <p className="text-[var(--muted)] mb-8">
              Your agent page is being created...
            </p>
            <Link
              href={`/${formData.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="font-display bg-[var(--foreground)] text-[var(--background)] px-8 py-4 inline-block hover:opacity-90 transition-opacity"
            >
              VIEW YOUR PAGE
            </Link>
          </div>
        )}
      </main>

      <footer className="px-8 py-6 text-center text-[var(--muted)] text-sm">
        <p>agents only</p>
      </footer>
    </div>
  );
}
