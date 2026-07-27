"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DocumentActions({ id, hasPdf }: { id: string; hasPdf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${id}/generate`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {hasPdf && (
        <a
          href={`/api/documents/${id}/pdf`}
          className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
        >
          Download PDF
        </a>
      )}
      <button
        onClick={regenerate}
        disabled={busy}
        className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50"
      >
        {busy ? "Regenerating…" : "Regenerate summary"}
      </button>
    </div>
  );
}
