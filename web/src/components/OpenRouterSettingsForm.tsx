"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function OpenRouterSettingsForm() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setModel(data.openRouterModel ?? "openai/gpt-4o-mini");
        setHasKey(Boolean(data.hasOpenRouterKey));
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(apiKey ? { openRouterApiKey: apiKey } : {}),
          openRouterModel: model,
        }),
      });
      if (res.ok) {
        setSaved(true);
        if (apiKey) {
          setHasKey(true);
          setApiKey("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-black/10 dark:border-white/10 p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="apiKey">
          OpenRouter API key {hasKey && <span className="text-black/40 dark:text-white/40 font-normal">(currently set)</span>}
        </label>
        <input
          id="apiKey"
          type="password"
          placeholder={hasKey ? "•••••••••••••• (leave blank to keep)" : "sk-or-v1-..."}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="model">
          Model
        </label>
        <input
          id="model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="openai/gpt-4o-mini"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-black/50 dark:text-white/50 mt-1">
          Any model id from{" "}
          <a href="https://openrouter.ai/models" className="underline" target="_blank" rel="noreferrer">
            openrouter.ai/models
          </a>
          .
        </p>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && <span className="ml-3 text-sm text-green-600 dark:text-green-400">Saved.</span>}
    </form>
  );
}
