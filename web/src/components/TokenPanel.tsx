"use client";

import { useEffect, useState } from "react";

export default function TokenPanel() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setHasToken(Boolean(data.hasApiToken)));
  }, []);

  async function rotate() {
    if (
      hasToken &&
      !confirm("This invalidates the current token — any extension using it will need the new one. Continue?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/token", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setNewToken(data.token);
        setHasToken(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
      <p className="text-sm mb-1">
        <span className="font-medium">Server URL:</span>{" "}
        <code className="bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5">{appUrl}</code>
      </p>

      {newToken ? (
        <div className="mt-3">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
            Copy this now — it won&rsquo;t be shown again.
          </p>
          <code className="block break-all bg-black/5 dark:bg-white/10 rounded px-2 py-2 text-sm">
            {newToken}
          </code>
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50 mt-3">
          {hasToken === null ? "Loading…" : hasToken ? "A token has already been generated." : "No token yet."}
        </p>
      )}

      <button
        onClick={rotate}
        disabled={busy}
        className="mt-3 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
      >
        {busy ? "Generating…" : hasToken ? "Generate new token" : "Generate token"}
      </button>
    </div>
  );
}
