import { useState, useRef } from "react";
import { Eye, EyeOff, Send, Terminal, Loader2, CheckCircle2, XCircle, Copy, Check } from "lucide-react";

type Provider = "openai" | "claude" | "gemini" | "copilot";

interface ProviderConfig {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  models: string[];
  baseUrl: string;
  docsUrl: string;
  keyPlaceholder: string;
  icon: string;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    color: "#10a37f",
    bgColor: "rgba(16, 163, 127, 0.08)",
    borderColor: "rgba(16, 163, 127, 0.3)",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    baseUrl: "https://api.openai.com/v1/chat/completions",
    docsUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
    icon: "⬡",
  },
  claude: {
    name: "Claude",
    color: "#d4a574",
    bgColor: "rgba(212, 165, 116, 0.08)",
    borderColor: "rgba(212, 165, 116, 0.3)",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
    baseUrl: "https://api.anthropic.com/v1/messages",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-...",
    icon: "◈",
  },
  gemini: {
    name: "Gemini",
    color: "#4285f4",
    bgColor: "rgba(66, 133, 244, 0.08)",
    borderColor: "rgba(66, 133, 244, 0.3)",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    docsUrl: "https://aistudio.google.com/app/apikey",
    keyPlaceholder: "AIza...",
    icon: "✦",
  },
  copilot: {
    name: "GitHub Copilot",
    color: "#8957e5",
    bgColor: "rgba(137, 87, 229, 0.08)",
    borderColor: "rgba(137, 87, 229, 0.3)",
    models: ["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "gemini-1.5-pro"],
    baseUrl: "https://api.githubcopilot.com/chat/completions",
    docsUrl: "https://github.com/settings/copilot",
    keyPlaceholder: "ghu_... or ghp_...",
    icon: "⊙",
  },
};

interface TestResult {
  status: "success" | "error";
  message: string;
  responseTime: number;
  output?: string;
  rawStatus?: number;
}

async function callOpenAI(apiKey: string, model: string, prompt: string, baseUrl: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
      }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    if (!res.ok) {
      return { status: "error", message: data?.error?.message ?? `HTTP ${res.status}`, responseTime: elapsed, rawStatus: res.status };
    }
    return {
      status: "success",
      message: "Key valid — response received",
      responseTime: elapsed,
      output: data?.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2),
    };
  } catch (e: unknown) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", responseTime: Date.now() - start };
  }
}

async function callClaude(apiKey: string, model: string, prompt: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    if (!res.ok) {
      return { status: "error", message: data?.error?.message ?? `HTTP ${res.status}`, responseTime: elapsed, rawStatus: res.status };
    }
    return {
      status: "success",
      message: "Key valid — response received",
      responseTime: elapsed,
      output: data?.content?.[0]?.text ?? JSON.stringify(data, null, 2),
    };
  } catch (e: unknown) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", responseTime: Date.now() - start };
  }
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    if (!res.ok) {
      return { status: "error", message: data?.error?.message ?? `HTTP ${res.status}`, responseTime: elapsed, rawStatus: res.status };
    }
    return {
      status: "success",
      message: "Key valid — response received",
      responseTime: elapsed,
      output: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data, null, 2),
    };
  } catch (e: unknown) {
    return { status: "error", message: e instanceof Error ? e.message : "Network error", responseTime: Date.now() - start };
  }
}

async function runTest(provider: Provider, apiKey: string, model: string, prompt: string): Promise<TestResult> {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, model, prompt, PROVIDERS.openai.baseUrl);
    case "claude":
      return callClaude(apiKey, model, prompt);
    case "gemini":
      return callGemini(apiKey, model, prompt);
    case "copilot":
      return callOpenAI(apiKey, model, prompt, PROVIDERS.copilot.baseUrl);
  }
}

export default function App() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(PROVIDERS.openai.models[0]);
  const [prompt, setPrompt] = useState("Say hello in exactly one sentence.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const cfg = PROVIDERS[provider];

  function selectProvider(p: Provider) {
    setProvider(p);
    setModel(PROVIDERS[p].models[0]);
    setResult(null);
  }

  async function handleTest() {
    if (!apiKey.trim() || !prompt.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await runTest(provider, apiKey.trim(), model, prompt.trim());
    setResult(res);
    setLoading(false);
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  async function copyOutput() {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canTest = apiKey.trim().length > 0 && prompt.trim().length > 0 && !loading;

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Terminal size={18} className="text-accent" />
        <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
          api key tester
        </span>
        <span className="ml-auto text-xs text-muted-foreground opacity-50">v1.0.0</span>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-8 max-w-2xl mx-auto w-full">
        {/* Provider selector */}
        <section className="w-full">
          <label className="block text-xs text-muted-foreground tracking-widest uppercase mb-3">
            01 — Select Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PROVIDERS) as Provider[]).map((p) => {
              const c = PROVIDERS[p];
              const active = p === provider;
              return (
                <button
                  key={p}
                  onClick={() => selectProvider(p)}
                  className="flex flex-col items-center gap-2 px-3 py-4 rounded-lg border transition-all duration-200 text-sm font-medium"
                  style={{
                    background: active ? c.bgColor : "transparent",
                    borderColor: active ? c.borderColor : "rgba(255,255,255,0.06)",
                    color: active ? c.color : "#6b6b80",
                    boxShadow: active ? `0 0 0 1px ${c.borderColor}` : "none",
                  }}
                >
                  <span className="text-2xl leading-none">{c.icon}</span>
                  <span className="text-xs">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* API Key */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-muted-foreground tracking-widest uppercase">
              02 — API Key
            </label>
            <a
              href={cfg.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors"
              style={{ color: cfg.color, opacity: 0.8 }}
            >
              get key ↗
            </a>
          </div>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={cfg.keyPlaceholder}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground pr-11 outline-none transition-all focus:border-accent/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </section>

        {/* Model */}
        <section className="w-full">
          <label className="block text-xs text-muted-foreground tracking-widest uppercase mb-3">
            03 — Model
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cfg.models.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="text-left px-4 py-2.5 rounded-lg border text-xs transition-all duration-150"
                style={{
                  background: model === m ? cfg.bgColor : "transparent",
                  borderColor: model === m ? cfg.borderColor : "rgba(255,255,255,0.06)",
                  color: model === m ? cfg.color : "#6b6b80",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* Prompt */}
        <section className="w-full">
          <label className="block text-xs text-muted-foreground tracking-widest uppercase mb-3">
            04 — Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Enter a test prompt..."
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none transition-all focus:border-accent/40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </section>

        {/* Run button */}
        <button
          onClick={handleTest}
          disabled={!canTest}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: canTest ? cfg.color : "#2e2e38",
            color: canTest ? "#0d0d0f" : "#6b6b80",
            boxShadow: canTest ? `0 0 20px ${cfg.color}30` : "none",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send size={15} />
              Run Test
            </>
          )}
        </button>

        {/* Result */}
        {result && (
          <section ref={outputRef} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Status bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-t-lg border border-b-0 text-xs"
              style={{
                background: result.status === "success" ? "rgba(0,229,160,0.06)" : "rgba(255,74,106,0.06)",
                borderColor: result.status === "success" ? "rgba(0,229,160,0.2)" : "rgba(255,74,106,0.2)",
              }}
            >
              {result.status === "success" ? (
                <CheckCircle2 size={14} style={{ color: "#00e5a0" }} />
              ) : (
                <XCircle size={14} style={{ color: "#ff4a6a" }} />
              )}
              <span style={{ color: result.status === "success" ? "#00e5a0" : "#ff4a6a" }}>
                {result.message}
              </span>
              <span className="ml-auto text-muted-foreground">{result.responseTime}ms</span>
              {result.rawStatus && (
                <span className="text-muted-foreground">HTTP {result.rawStatus}</span>
              )}
            </div>

            {/* Output body */}
            <div
              className="relative border rounded-b-lg"
              style={{
                borderColor: result.status === "success" ? "rgba(0,229,160,0.2)" : "rgba(255,74,106,0.2)",
              }}
            >
              <pre
                className="px-4 py-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words text-foreground/80 max-h-72 overflow-y-auto"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {result.output ?? result.message}
              </pre>

              {result.output && (
                <button
                  onClick={copyOutput}
                  className="absolute top-2 right-2 p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy output"
                >
                  {copied ? <Check size={13} style={{ color: "#00e5a0" }} /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground opacity-40">
          Keys are never stored — requests go directly from your browser to the provider.
        </p>
      </footer>
    </div>
  );
}
