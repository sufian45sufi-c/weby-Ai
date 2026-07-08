import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const CODE_SNIPPET = `export default function App() {
  return (
    <div className="hero">
      <h1>Fabion</h1>
      <p>Built for thinking,
      creating, executing.</p>
    </div>
  );
}`;

const TERMINAL_LINES = [
  "$ fabion run --workspace",
  "> Booting environment...",
  "> Installing dependencies...",
  "> Compiling components...",
  "✓ Ready in 0.34s",
];

export default function WorkspaceShowcase() {
  const codeRef = useRef(null);
  const cursorRef = useRef(null);
  const terminalRef = useRef(null);
  const previewRef = useRef(null);
  const tabPixelRef = useRef(null);
  const tabPreviewRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let gsap;
    let ctx;

    import("gsap").then((mod) => {
      gsap = mod.gsap;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });

        // Reset state at the start of every loop
        tl.set(codeRef.current, { text: "" });
        tl.set(terminalRef.current.children, { opacity: 0, y: 6 });
        tl.set(previewRef.current, { opacity: 0, scale: 0.98 });
        tl.set(cursorRef.current, { x: 40, y: 40, opacity: 0 });

        // Cursor fades in near the file tab
        tl.to(cursorRef.current, { opacity: 1, duration: 0.3 }, 0.2);
        tl.to(
          cursorRef.current,
          { x: 96, y: 18, duration: 0.6, ease: "power2.inOut" },
          0.3
        );
        tl.to(tabPixelRef.current, { backgroundColor: "rgba(255,255,255,0.08)", duration: 0.2 }, 0.9);

        // Typewriter effect on the code panel
        const chars = CODE_SNIPPET.split("");
        const typeDuration = 4.5;
        tl.to(
          { count: 0 },
          {
            count: chars.length,
            duration: typeDuration,
            ease: "none",
            onUpdate: function () {
              const n = Math.floor(this.targets()[0].count);
              if (codeRef.current) {
                codeRef.current.textContent = chars.slice(0, n).join("");
              }
            },
          },
          1.1
        );

        // Terminal lines appear one by one, staggered, overlapping the typing
        Array.from(terminalRef.current.children).forEach((line, i) => {
          tl.to(
            line,
            { opacity: 1, y: 0, duration: 0.35, ease: "power1.out" },
            2.5 + i * 0.55
          );
        });

        // Cursor moves toward the Preview tab
        tl.to(
          cursorRef.current,
          { x: 200, y: 18, duration: 0.6, ease: "power2.inOut" },
          6.2
        );
        tl.to(tabPreviewRef.current, { backgroundColor: "rgba(255,255,255,0.08)", duration: 0.2 }, 6.7);
        tl.to(tabPixelRef.current, { backgroundColor: "transparent", duration: 0.2 }, 6.7);

        // Live preview fades in
        tl.to(
          previewRef.current,
          { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
          6.9
        );

        // Cursor fades out, hold the final frame briefly before looping
        tl.to(cursorRef.current, { opacity: 0, duration: 0.4 }, 8.8);
        tl.to({}, { duration: 3 }); // hold before loop restarts
      }, containerRef);
    });

    return () => ctx && ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border border-[#1f1f1f] bg-black overflow-hidden shadow-2xl"
      style={{ aspectRatio: "16 / 10" }}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full border border-[#333]" />
          <div className="w-2.5 h-2.5 rounded-full border border-[#333]" />
          <div className="w-2.5 h-2.5 rounded-full border border-[#333]" />
        </div>
        <div className="flex gap-2">
          <div
            ref={tabPixelRef}
            className="text-[10px] uppercase tracking-widest text-[#9A9A9A] px-3 py-1 rounded-full border border-[#1f1f1f]"
          >
            Editor
          </div>
          <div
            ref={tabPreviewRef}
            className="text-[10px] uppercase tracking-widest text-[#9A9A9A] px-3 py-1 rounded-full border border-[#1f1f1f]"
          >
            Preview
          </div>
        </div>
      </div>

      <div className="relative flex h-[calc(100%-96px)]">
        {/* Code panel */}
        <div className="w-1/2 border-r border-[#1f1f1f] p-5 overflow-hidden">
          <pre
            ref={codeRef}
            className="text-[11px] leading-relaxed text-[#e4e4e4] font-mono whitespace-pre-wrap"
          />
        </div>

        {/* Live preview panel */}
        <div className="w-1/2 relative flex items-center justify-center p-5">
          <motion.div
            ref={previewRef}
            className="w-full h-full border border-[#1f1f1f] rounded-xl flex flex-col items-center justify-center text-center gap-2"
          >
            <h1
              className="text-2xl italic"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Fabion
            </h1>
            <p className="text-[#9A9A9A] text-[11px] max-w-[180px]">
              Built for thinking, creating, executing.
            </p>
          </motion.div>
        </div>

        {/* Fake cursor */}
        <div
          ref={cursorRef}
          className="absolute top-0 left-0 w-3 h-3 rounded-full bg-white pointer-events-none"
          style={{ boxShadow: "0 0 12px rgba(255,255,255,0.6)" }}
        />
      </div>

      {/* Terminal */}
      <div className="border-t border-[#1f1f1f] px-5 py-3 h-24 overflow-hidden">
        <div ref={terminalRef} className="space-y-1 font-mono text-[11px]">
          {TERMINAL_LINES.map((line, i) => (
            <div
              key={i}
              className={i === TERMINAL_LINES.length - 1 ? "text-white" : "text-[#9A9A9A]"}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
