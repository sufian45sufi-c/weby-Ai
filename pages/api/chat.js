import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const rateLimitStore = new Map();
const MAX_PER_MINUTE = 10;
const MAX_PER_DAY = 150;

function checkRateLimit(userId) {
  const now = Date.now();
  let entry = rateLimitStore.get(userId);
  if (!entry) {
    entry = { minuteCount: 0, minuteReset: now + 60_000, dayCount: 0, dayReset: now + 86_400_000 };
  }
  if (now > entry.minuteReset) {
    entry.minuteCount = 0;
    entry.minuteReset = now + 60_000;
  }
  if (now > entry.dayReset) {
    entry.dayCount = 0;
    entry.dayReset = now + 86_400_000;
  }
  if (entry.minuteCount >= MAX_PER_MINUTE) {
    rateLimitStore.set(userId, entry);
    return { allowed: false, reason: "Too many messages. Please wait a moment." };
  }
  if (entry.dayCount >= MAX_PER_DAY) {
    rateLimitStore.set(userId, entry);
    return { allowed: false, reason: "Daily message limit reached. Try again tomorrow." };
  }
  entry.minuteCount += 1;
  entry.dayCount += 1;
  rateLimitStore.set(userId, entry);
  return { allowed: true };
}

const EFFORT_MODEL_MAP = {
  low: "llama-3.1-8b-instant",
  medium: "llama-3.3-70b-versatile",
  high: "llama-3.3-70b-versatile",
  extra: "deepseek-r1-distill-llama-70b",
  max: "deepseek-r1-distill-llama-70b",
};

const FORMATTING_INSTRUCTIONS = `
Formatting rules you must always follow:
- Write in clear, flowing prose. Avoid bullet-point lists unless the user asks for a list or is comparing distinct items.
- Use **bold** (double asterisks) only around genuinely important terms, names, or conclusions — never entire sentences.
- Never use single asterisks for emphasis.
- When you write code, always use a fenced code block with the language name, like: \`\`\`javascript ... \`\`\`. Never show code inline without fencing it.
`;

const PERSONA_PROMPTS = {
  thread: `You are Thread 1.0, an ultra-fast assistant. Prioritize speed and directness — give the shortest correct answer that fully satisfies the request. Skip preamble.`,
  pixel: `You are Pixel 1.0, a sharp and structured assistant that specializes in code. When writing code, produce clean, correct, production-quality code with proper structure and naming. Explain your code briefly before or after the block, not inside it. Be precise and technical.`,
  cell: `You are Cell 1.0, a creative, multi-step reasoning assistant. Break complex requests into clear steps, think through tradeoffs, and offer thoughtful, well-rounded answers. You're comfortable with open-ended, ambiguous, or creative tasks.`,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    messages,
    userId,
    effort = "medium",
    thinking = false,
    memorySummary = "",
    persona = "pixel",
  } = req.body;

  if (!userId) return res.status(401).json({ error: "Missing user identity." });
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.reason });
  }

  const model = EFFORT_MODEL_MAP[effort] || EFFORT_MODEL_MAP.medium;
  const isReasoningModel = effort === "extra" || effort === "max";
  const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pixel;

  let systemContent = `${personaPrompt}\n\n${FORMATTING_INSTRUCTIONS}`;
  if (memorySummary && memorySummary.trim()) {
    systemContent += `\n\nWhat you remember about this user from previous conversations:\n${memorySummary}`;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    const requestParams = {
      messages: [{ role: "system", content: systemContent }, ...messages],
      model,
      stream: true,
    };
    if (isReasoningModel) {
      requestParams.reasoning_format = thinking ? "raw" : "hidden";
    }

    const stream = await groq.chat.completions.create(requestParams);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) res.write(content);
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.write("Error streaming response from the agent.");
    res.end();
  }
}
