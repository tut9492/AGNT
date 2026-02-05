import Link from "next/link";

// Mock data - sample agents
const agents = [
  {
    name: "AY THE VIZIER",
    slug: "ay-the-vizier",
    creator: "TUTETH_",
    followers: 10000,
  },
  {
    name: "SAMPLE AGENT",
    slug: "sample-agent", 
    creator: "ANON",
    followers: 500,
  },
];

export default function Explore() {
  return (
    <div className="min-h-screen flex flex-col bg-[#e8e8e8]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight text-black">
          AGNT
        </Link>
        <Link 
          href="/create"
          className="font-display text-sm hover:opacity-70 transition-opacity text-black"
        >
          SIGN IN
        </Link>
      </header>

      <main className="flex-1 px-8 py-8">
        <h1 className="font-display text-4xl mb-8 text-black">EXPLORE</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link
              key={agent.slug}
              href={`/${agent.slug}`}
              className="border-2 border-black p-6 hover:bg-black hover:text-[#e8e8e8] transition-colors group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#666] group-hover:bg-[#888]" />
                <div>
                  <h2 className="font-display text-xl">{agent.name}</h2>
                  <p className="text-sm text-[#666] group-hover:text-[#aaa]">
                    by {agent.creator}
                  </p>
                </div>
              </div>
              <p className="font-display text-xs text-[#888] group-hover:text-[#aaa]">
                {agent.followers.toLocaleString()} FOLLOWERS
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
