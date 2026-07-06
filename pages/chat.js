import Head from "next/head";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set, push } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";

function deriveTitle(text) {
  const trimmed = text.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const extMap = {
      javascript: "js", js: "js", python: "py", html: "html", css: "css",
      json: "json", typescript: "ts", jsx: "jsx", tsx: "tsx", bash: "sh", shell: "sh",
    };
    const ext = extMap[language?.toLowerCase()] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-neutral-800">
      <div className="flex items-center justify-between bg-neutral-800 px-4 py-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
          {language || "code"}
        </span>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="bg-neutral-900 text-neutral-100 p-4 overflow-x-auto text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedText({ text }) {
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.startsWith("```")) {
          const match = segment.match(/```(\w+)?\n?([\s\S]*?)```/);
          const language = match?.[1] || "";
          const code = (match?.[2] || segment.replace(/```/g, "")).trim();
          return <CodeBlock key={i} code={code} language={language} />;
        }

        const boldParts = segment.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {boldParts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

const REASONING_START = "\u0002";
const REASONING_END = "\u0003";

export default function Chat() {
  const [userId, setUserId] = useState(null);
  const [checking, setChecking] = useState(true);

  const [chatsData, setChatsData] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [effort, setEffort] = useState("medium");
  const [thinking, setThinking] = useState(false);
  const [persona, setPersona] = useState("pixel");
  const [memorySummary, setMemorySummary] = useState("");

  const bottomRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.uid);

      const convosRef = ref(db, `conversations/${user.uid}`);
      const snap = await get(convosRef);
      if (snap.exists()) {
        const data = snap.val();
        setChatsData(data);
        const sortedIds = Object.keys(data).sort(
          (a, b) => (data[b].updatedAt || 0) - (data[a].updatedAt || 0)
        );
        if (sortedIds.length > 0) {
          const mostRecent = sortedIds[0];
          setActiveChatId(mostRecent);
          setMessages(data[mostRecent].messages || []);
        }
      }

      const settingsSnap = await get(ref(db, `settings/${user.uid}`));
      if (settingsSnap.exists()) {
        const s = settingsSnap.val();
        setEffort(s.effort || "medium");
        setThinking(!!s.thinking);
        setPersona(s.persona || "pixel");
      }

      const memSnap = await get(ref(db, `memory/${user.uid}`));
      if (memSnap.exists()) {
        setMemorySummary(memSnap.val().summary || "");
      }

      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatList = useMemo(() => {
    const list = Object.entries(chatsData).map(([id, val]) => ({
      id,
      title: val.title || "New chat",
      updatedAt: val.updatedAt || 0,
    }));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [chatsData, searchQuery]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setMessages(chatsData[id]?.messages || []);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const priorMessages = messages;
    let chatId = activeChatId;
    const isNewChat = !chatId;

    if (isNewChat) {
      const newRef = push(ref(db, `conversations/${userId}`));
      chatId = newRef.key;
      setActiveChatId(chatId);
    }

    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { sender: "user", text },
      { sender: "agent", text: "", reasoning: "" },
    ]);

    let accumulated = "";
    let reasoningAccumulated = "";

    try {
      const conversationHistory = [...priorMessages, { sender: "user", text }].map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          userId,
          effort,
          thinking,
          memorySummary,
          persona,
        }),
      });

      if (res.status === 429) {
        const errData = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { sender: "agent", text: errData.error };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let inReasoning = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let output = "";
        for (let i = 0; i < buffer.length; i++) {
          const ch = buffer[i];
          if (ch === REASONING_START) {
            inReasoning = true;
          } else if (ch === REASONING_END) {
            inReasoning = false;
          } else if (inReasoning) {
            reasoningAccumulated += ch;
          } else {
            output += ch;
          }
        }
        buffer = "";
        accumulated += output;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            sender: "agent",
            text: accumulated,
            reasoning: reasoningAccumulated,
          };
          return updated;
        });
      }
    } catch (err) {
      accumulated = "Error reaching the agent. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { sender: "agent", text: accumulated };
        return updated;
      });
    } finally {
      setIsStreaming(false);

      if (accumulated) {
        const finalMessages = [
          ...priorMessages,
          { sender: "user", text },
          { sender: "agent", text: accumulated, reasoning: reasoningAccumulated },
        ];

        const existing = chatsData[chatId];
        const title = isNewChat ? deriveTitle(text) : existing?.title || deriveTitle(text);
        const
