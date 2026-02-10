"use client";

import { useEffect } from "react";

export default function CreateAgent() {
  useEffect(() => {
    window.location.href = "https://agnt.social/#create";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8e8e8]">
      <p className="font-display text-lg text-[#888] animate-pulse">REDIRECTING TO AGNT.SOCIAL...</p>
    </div>
  );
}
