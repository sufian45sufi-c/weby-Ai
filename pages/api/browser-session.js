import { Sandbox } from "@vercel/sandbox";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "5mb" },
  },
};

// In-memory session store: sandboxId -> { sandbox, createdAt }
// Note: resets on cold start, same limitation as the rate limiter.
const activeSandboxes = new Map();

async function getOrCreateSandbox(sessionId) {
  const existing = activeSandboxes.get(sessionId);
  if (existing) return existing.sandbox;

  const sandbox = await Sandbox.create({ timeout: 300_000 });

  await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "playwright-core"],
  });

  activeSandboxes.set(sessionId, { sandbox, createdAt: Date.now() });
  return sandbox;
}

const BROWSER_SCRIPT = `
const { chromium } = require('playwright-core');
const action = JSON.parse(process.argv[2]);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    if (action.type === 'navigate') {
      await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } else if (action.type === 'click') {
      await page.click(action.selector, { timeout: 10000 });
    } else if (action.type === 'type') {
      await page.fill(action.selector, action.text, { timeout: 10000 });
    } else if (action.type === 'scroll') {
      await page.evaluate((y) => window.scrollBy(0, y), action.amount || 500);
    }

    await page.waitForTimeout(500);
    const screenshot = await page.screenshot({ encoding: 'base64' });
    const title = await page.title();
    const url = page.url();
    const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));

    console.log(JSON.stringify({ screenshot, title, url, text }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
  } finally {
    await browser.close();
  }
})();
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sessionId, action } = req.body;

  if (!sessionId || !action) {
    return res.status(400).json({ error: "sessionId and action are required" });
  }

  try {
    const sandbox = await getOrCreateSandbox(sessionId);

    await sandbox.writeFiles([
      { path: "browser-action.js", content: Buffer.from(BROWSER_SCRIPT, "utf-8") },
    ]);

    const proc = await sandbox.runCommand({
      cmd: "node",
      args: ["browser-action.js", JSON.stringify(action)],
      stdout: "pipe",
      stderr: "pipe",
    });

    let output = "";
    for await (const chunk of proc.stdout) {
      output += chunk.toString();
    }

    let errorOutput = "";
    for await (const chunk of proc.stderr) {
      errorOutput += chunk.toString();
    }

    const lastLine = output.trim().split("\n").pop();
    const result = JSON.parse(lastLine);

    if (result.error) {
      return res.status(200).json({ error: result.error, stderr: errorOutput });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Browser action failed" });
  }
}
