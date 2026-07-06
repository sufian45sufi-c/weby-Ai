import Head from "next/head";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set, push, remove } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";
import { FormattedText, CanvasPanel, ModelDropdown, ChatListItem } from "../components/ChatWidgets";

function deriveTitle(text) {
  const trimmed = text.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
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

  const [canvas, setCanvas] = useState(null);

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

  useEffect(() => {
    if (!userId || checking) return;
    set(ref(db, `settings/${userId}`), { effort, thinking, persona });
  }, [effort, thinking, persona, userId, checking]);

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
    setCanvas(null);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setMessages(chatsData[id]?.messages || []);
    setCanvas(null);
  };

  const handleRenameChat = async (id, newTitle) => {
    await set(ref(db, `conversations/${userId}/${id}/title`), newTitle);
    setChatsData((prev) => ({
      ...prev,
      [id]: { ...prev[id], title: newTitle },
    }));
  };

  const handleDeleteChat = async (id) => {
    await remove(ref(db, `conversations/${userId}/${id}`));
    setChatsData((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
      setCanvas(null);
    }
  };

  const handleOpenCanvas = (code, language) => {
    setCanvas({ code, language: language || "text" });
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
        const createdAt = existing?.createdAt || Date.now();
        const updatedAt = Date.now();

        await set(ref(db, `conversations/${userId}/${chatId}`), {
          title,
          messages: finalMessages,
          createdAt,
          updatedAt,
        });

        setChatsData((prev) => ({
          ...prev,
          [chatId]: { title, messages: finalMessages, createdAt, updatedAt },
        }));

        fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userText: text,
            agentText: accumulated,
            existingSummary: memorySummary,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.summary) {
              setMemorySummary(data.summary);
              set(ref(db, `memory/${userId}`), {
                summary: data.summary,
                updatedAt: Date.now(),
              });
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Chat | Fabian</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="flex h-screen bg-white text-neutral-900"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <aside className="w-72 border-r border-neutral-200 flex flex-col h-screen shrink-0">
          <div className="p-6 border-b border-neutral-200">
            <div
              className="text-lg font-bold tracking-tight mb-4"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Fabian.
            </div>
            <button
              onClick={handleNewChat}
              className="w-full bg-neutral-900 text-white text-xs uppercase tracking-widest py-2.5 rounded-full hover:bg-neutral-700 transition-all"
            >
              + New chat
            </button>
          </div>

          <div className="p-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full border border-neutral-200 bg-transparent px-4 py-2 rounded-full text-sm focus:outline-none focus:border-neutral-400 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {chatList.length === 0 && (
              <div className="text-xs text-neutral-400 px-4 py-2">
                {searchQuery ? "No chats found" : "No chats yet"}
              </div>
            )}
            {chatList.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                onSelect={handleSelectChat}
                onRename={handleRenameChat}
                onDelete={handleDeleteChat}
              />
            ))}
          </div>

          <div className="p-4 border-t border-neutral-200 space-y-1">
            <button
              onClick={() => router.push("/settings")}
              className="w-full text-left text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors py-1"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors py-1"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col h-screen">
          <header className="shrink-0 p-6 flex justify-between items-center border-b border-neutral-100">
            <div className="text-sm font-medium">
              Fabian <span className="text-neutral-400">Agent</span>
            </div>
          </header>

          <main
            className={`flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center ${
              messages.length === 0 ? "justify-center" : ""
            }`}
          >
            <div className="max-w-3xl w-full space-y-8">
              {messages.length === 0 && (
                <div className="text-center">
                  <h2
                    className="text-5xl mb-12"
                    style={{ fontFamily: "'EB Garamond', serif" }}
                  >
                    How can I help you today?
                  </h2>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-2xl ${msg.sender === "user" ? "ml-auto" : ""}`}
                >
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                    {msg.sender}
                  </div>

                  {msg.sender === "agent" && msg.reasoning && (
                    <details className="mb-2 text-xs text-neutral-400 border border-neutral-200 rounded-lg px-3 py-2">
                      <summary className="cursor-pointer uppercase tracking-widest text-[10px]">
                        Thinking
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap italic">
                        {msg.reasoning}
                      </div>
                    </details>
                  )}

                  <div
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user" ? "text-right" : ""
                    }`}
                  >
                    <FormattedText text={msg.text} onOpenCanvas={handleOpenCanvas} />
                    {isStreaming &&
                      msg.sender === "agent" &&
                      i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-4 bg-neutral-900 ml-1 animate-pulse align-middle" />
                      )}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          </main>

          <div className="shrink-0 px-6 pb-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl p-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full bg-transparent px-4 py-3 focus:outline-none text-sm"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <ModelDropdown
                    persona={persona}
                    setPersona={setPersona}
                    effort={effort}
                    setEffort={setEffort}
                    thinking={thinking}
                    setThinking={setThinking}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isStreaming}
                    className="bg-neutral-900 text-white p-2.5 rounded-full hover:bg-neutral-700 transition-all disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14M12 5l7 7-7 7"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {canvas && (
          <CanvasPanel
            code={canvas.code}
            language={canvas.language}
            onChange={(newCode) => setCanvas({ ...canvas, code: newCode })}
            onClose={() => setCanvas(null)}
          />
        )}
      </div>
    </>
  );
}
