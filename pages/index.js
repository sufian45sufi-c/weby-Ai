import Head from "next/head";
import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";

function HeroScene() {
  const stars = [
    [40, 90], [150, 40], [300, 118], [370, 260], [560, 100], [660, 130],
    [780, 60], [975, 130], [1210, 90], [1280, 260], [1470, 90], [1550, 195],
    [65, 340], [500, 300], [900, 385], [1100, 245], [225, 200], [1330, 340],
  ];

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.1" fill="white" />
        </pattern>
        <pattern id="dotsSparse" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1" fill="white" opacity="0.6" />
        </pattern>
      </defs>

      <rect width="1600" height="900" fill="#000000" />

      {stars.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.6 : 1} fill="white" opacity="0.8" />
      ))}

      {/* Moon */}
      <circle cx="480" cy="205" r="45" fill="url(#dots)" />

      {/* Clouds */}
      <ellipse cx="260" cy="245" rx="90" ry="18" fill="url(#dotsSparse)" />
      <ellipse cx="1160" cy="280" rx="110" ry="20" fill="url(#dotsSparse)" />

      {/* Back mountain range */}
      <polygon
        points="0,620 200,340 420,470 620,300 900,560 1150,380 1350,540 1600,430 1600,900 0,900"
        fill="url(#dotsSparse)"
        opacity="0.5"
      />

      {/* Front mountain range */}
      <polygon
        points="0,720 260,330 430,520 640,280 820,560 1600,650 1600,900 0,900"
        fill="url(#dots)"
      />

      {/* Pine trees, right side */}
      {[
        [1080, 610, 90],
        [1160, 560, 130],
        [1250, 520, 170],
        [1340, 480, 210],
        [1430, 440, 250],
        [1520, 460, 220],
      ].map(([x, baseY, h], i) => (
        <polygon
          key={i}
          points={`${x},${baseY - h} ${x - h * 0.28},${baseY} ${x + h * 0.28},${baseY}`}
          fill="url(#dots)"
        />
      ))}
    </svg>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToModels = () => {
    document.getElementById("models")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <title>Fabion | AI Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital@1&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="bg-black text-white min-h-screen selection:bg-white selection:text-black antialiased"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <nav
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-2 rounded-full border border-[#1f1f1f] transition-all duration-500 backdrop-blur-xl ${
            scrolled ? "bg-black/80 w-[90%] md:w-[700px] shadow-2xl" : "bg-black/40 w-[90%] md:w-[700px]"
          }`}
        >
          <div className="font-bold tracking-tighter text-sm cursor-pointer px-2">FABION</div>
          <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest text-[#9A9A9A]">
            <button onClick={scrollToModels} className="hover:text-white transition-colors duration-300">
              Models
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-white transition-colors duration-300"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-white transition-colors duration-300"
            >
              Demo
            </button>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => {
                setAuthMode(false);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-all"
            >
              Sign Up
            </button>
          </div>
        </nav>

        <section id="hero" className="relative min-h-screen flex flex-col justify-center items-center px-6 overflow-hidden">
          <HeroScene />
          <div className="relative z-10 flex flex-col items-center pt-20">
            <h1
              className="text-[80px] md:text-[140px] italic leading-[0.9] mb-8 text-center"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Fabion
            </h1>
            <p className="text-[#9A9A9A] text-center max-w-sm mb-12 text-sm">
              The intelligence that works, not waits. Built for thinking, creating, and executing.
            </p>
            <button
              onClick={scrollToModels}
              className="px-8 py-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
            >
              Start Building
            </button>
          </div>
        </section>

        <section id="models" className="py-32 px-8 max-w-6xl mx-auto border-t border-[#1f1f1f]">
          <h2 className="text-4xl italic mb-20" style={{ fontFamily: "'EB Garamond', serif" }}>
            Three models. One intelligence.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Thread
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Ultra-fast reasoning for quick, direct answers.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <span className="text-[10px] uppercase tracking-widest text-[#9A9A9A]">Explore →</span>
            </div>

            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Pixel
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Sharp, structured, and precise — built for code.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <span className="text-[10px] uppercase tracking-widest text-[#9A9A9A]">Explore →</span>
            </div>

            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Cell
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Creative, multi-step reasoning for complex problems.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <span className="text-[10px] uppercase tracking-widest text-[#9A9A9A]">Explore →</span>
            </div>
          </div>
        </section>

        <section id="features" className="py-32 px-8 max-w-6xl mx-auto border-t border-[#1f1f1f]">
          <h2 className="text-4xl italic mb-20" style={{ fontFamily: "'EB Garamond', serif" }}>
            Designed to disappear.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">01</span>
              </div>
              <h4 className="text-lg font-medium">Reasoning</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">02</span>
              </div>
              <h4 className="text-lg font-medium">Code</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">03</span>
              </div>
              <h4 className="text-lg font-medium">Research</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">04</span>
              </div>
              <h4 className="text-lg font-medium">Automation</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">05</span>
              </div>
              <h4 className="text-lg font-medium">Memory</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">06</span>
              </div>
              <h4 className="text-lg font-medium">Multi-chat</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
          </div>
        </section>

        <section id="demo" className="py-32 px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl italic mb-12" style={{ fontFamily: "'EB Garamond', serif" }}>
              Engineered to execute.
            </h2>
            <div className="bg-black border border-[#1f1f1f] p-8 rounded-2xl font-mono text-sm shadow-2xl overflow-hidden">
              <div className="flex gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-[#1f1f1f]" />
                <div className="w-3 h-3 rounded-full bg-[#1f1f1f]" />
                <div className="w-3 h-3 rounded-full bg-[#1f1f1f]" />
              </div>
              <div className="space-y-2 opacity-80">
                <p className="text-blue-400">$ Fabion — Thread 1.0</p>
                <p className="text-green-400 mt-4">&gt; Analyzing request...</p>
                <p className="text-green-400">&gt; Reasoning started...</p>
                <p className="text-green-400">&gt; Response ready: 0.4s</p>
              </div>
            </div>
          </div>
        </section>

        <section id="subscribe" className="py-32 px-8 text-center bg-[#0d0d0d]">
          <h2 className="text-6xl italic mb-8" style={{ fontFamily: "'EB Garamond', serif" }}>
            Build with Fabion.
          </h2>
          <p className="text-[#9A9A9A] max-w-md mx-auto mb-12 text-sm">
            Sign up to start chatting with Thread, Pixel, and Cell today.
          </p>
          <button
            onClick={() => {
              setAuthMode(true);
              setAuthOpen(true);
            }}
            className="px-8 py-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
          >
            Get Started
          </button>
        </section>

        <footer className="py-20 border-t border-[#1f1f1f] text-center text-[#444] text-[10px] uppercase tracking-widest">
          <p>© 2026 Fabion. All rights reserved.</p>
        </footer>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} startInSignUp={authMode} />
      </div>
    </>
  );
}
