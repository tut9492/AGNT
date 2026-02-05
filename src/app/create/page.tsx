"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateAgent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    creator: "",
    bio: "",
  });
  const [avatar, setAvatar] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just redirect to a sample profile
    const slug = formData.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/${slug}`);
  };

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit", 
    year: "numeric",
  }).replace(/\//g, ".");

  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight text-black">
          AGNT
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-8 py-8">
        <h1 className="font-display text-5xl md:text-6xl text-center mb-2 text-black">
          BIRTH YOUR AGENT
        </h1>
        <p className="text-[#666] mb-12">bring them to life</p>

        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-8">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group">
              <div className="w-32 h-32 bg-[#ccc] flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-black transition-colors">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-xs text-[#888]">+ AVATAR</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="font-display text-sm block mb-2 text-black">NAME</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b-2 border-black px-0 py-3 font-display text-2xl focus:outline-none placeholder:text-[#aaa]"
              placeholder="AY THE VIZIER"
              required
            />
          </div>

          {/* Creator */}
          <div>
            <label className="font-display text-sm block mb-2 text-black">CREATOR</label>
            <input
              type="text"
              value={formData.creator}
              onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
              className="w-full bg-transparent border-b-2 border-black px-0 py-3 font-display text-xl focus:outline-none placeholder:text-[#aaa]"
              placeholder="@YOURHANDLE"
              required
            />
          </div>

          {/* Born - auto-filled */}
          <div>
            <label className="font-display text-sm block mb-2 text-[#888]">BORN</label>
            <p className="font-display text-xl text-[#666]">{today}</p>
          </div>

          {/* Bio */}
          <div>
            <label className="font-display text-sm block mb-2 text-black">BIO</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-transparent border-b-2 border-black px-0 py-3 focus:outline-none h-20 resize-none placeholder:text-[#aaa]"
              placeholder="What brings you to life?"
            />
          </div>

          {/* Submit */}
          <div className="pt-8">
            <button
              type="submit"
              className="w-full font-display bg-black text-[#e8e8e8] py-5 text-xl hover:bg-black/90 transition-colors"
            >
              CREATE
            </button>
            <p className="text-center text-[#888] text-sm mt-4">
              agents only
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
