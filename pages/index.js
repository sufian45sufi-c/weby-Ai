import { useState } from "react";
import { Sparkles, ArrowRight, Wand2, Image as ImageIcon, Loader2 } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    if (!url) return;
    setLoading(true);
    // Placeholder — will connect to backend generation logic in a later step
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background bg-grid-glow text-white overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Weby <span className="text-primary">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </nav>

        <button className="text-sm font-medium px-4 py-2 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/10 transition-all">
          Sign In
        </button>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs text-white/60 mb-6">
          <Wand2 className="w-3.5 h-3.5 text-secondary" />
          AI-Powered Brand Design
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-3xl">
          Turn any website into
          <br />
          <span className="bg-gradient-to-r from-primary via-purple-400 to-secondary bg-clip-text text-transparent">
            stunning visual templates
          </span>
        </h1>

        <p className="text-white/50 mt-6 max-w-xl text-base md:text-lg">
          Paste a URL. Weby AI analyzes the brand's colors, fonts, and tone —
          then instantly generates matching templates and images for you.
        </p>

        {/* Input + Generate */}
        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-surface border border-border focus-within:border-primary/60 transition-colors shadow-lg">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              className="flex-1 bg-transparent outline-none px-3 py-2.5 text-sm md:text-base placeholder:text-white/30"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="group flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary font-medium text-sm md:text-base shadow-glow hover:shadow-glow-cyan transition-all disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-3">
            No sign-up required for your first generation.
          </p>
        </div>
      </section>

      {/* Results Grid */}
      <section className="px-6 md:px-12 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
            Generated Templates
          </h2>
          <span className="text-xs text-white/30">0 results</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-surface border border-border/60 flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-white/15" />
              <span className="text-[11px] text-white/20">Awaiting input</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
