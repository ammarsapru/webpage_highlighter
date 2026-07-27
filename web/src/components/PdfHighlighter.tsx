"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ColorToolbar from "@/components/ColorToolbar";
import { HIGHLIGHT_COLORS, colorLabel } from "@/lib/colors";
import { wrapRangeInMarks, removeMarksById } from "@/lib/pdf-highlight-dom";

interface StoredHighlight {
  id: string;
  text: string;
  color: string;
  markIds: string[];
}

const MAX_PAGE_SCALE = 1.6;

export default function PdfHighlighter() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [fullText, setFullText] = useState("");
  const [highlights, setHighlights] = useState<StoredHighlight[]>([]);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; range: Range } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setHighlights([]);
    setLoaded(false);
    setTitle(file.name.replace(/\.pdf$/i, ""));

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = "";

      // The sidebar is always in the DOM (see JSX below) precisely so this measurement is
      // stable - if it only mounted after `loaded` flipped true, pages would render at the
      // pre-sidebar (wider) column size and then overflow once the sidebar appeared.
      const containerWidth = container.clientWidth || 800;

      const textParts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const unscaledWidth = page.getViewport({ scale: 1 }).width;
        const scale = Math.min(containerWidth / unscaledWidth, MAX_PAGE_SCALE);
        const viewport = page.getViewport({ scale });

        const pageWrapper = document.createElement("div");
        pageWrapper.className = "relative mx-auto mb-4 shadow-sm";
        pageWrapper.style.width = `${viewport.width}px`;
        pageWrapper.style.height = `${viewport.height}px`;

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageWrapper.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const textContent = await page.getTextContent();
        textParts.push(
          textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
        );

        const textLayerDiv = document.createElement("div");
        textLayerDiv.className = "textLayer";
        pdfjsLib.setLayerDimensions(textLayerDiv, viewport);
        pageWrapper.appendChild(textLayerDiv);

        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();

        container.appendChild(pageWrapper);
      }

      setFullText(textParts.join("\n\n"));
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load PDF", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }, []);

  const onMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setToolbar(null);
      return;
    }
    const text = selection.toString().trim();
    if (!text) {
      setToolbar(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setToolbar({ x: rect.left + rect.width / 2, y: rect.top, range: range.cloneRange() });
  }, []);

  function applyColor(color: string) {
    if (!toolbar) return;
    const { range } = toolbar;
    const text = range.toString().trim();
    const markIds = wrapRangeInMarks(range, color);
    if (markIds.length > 0 && text) {
      setHighlights((prev) => [...prev, { id: crypto.randomUUID(), text, color, markIds }]);
    }
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  function removeHighlight(id: string) {
    const h = highlights.find((x) => x.id === id);
    if (h && containerRef.current) removeMarksById(containerRef.current, h.markIds);
    setHighlights((prev) => prev.filter((x) => x.id !== id));
  }

  async function submit() {
    if (highlights.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled PDF",
          sourceType: "pdf",
          pageContent: fullText,
          highlights: highlights.map((h, i) => ({ text: h.text, color: h.color, position: i })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to save document");
      router.push(`/documents/${data.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        {!loaded && (
          <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/20 dark:border-white/20 p-16 cursor-pointer text-center hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
            <span className="font-medium mb-1">{loading ? "Loading PDF…" : "Choose a PDF"}</span>
            <span className="text-sm text-black/50 dark:text-white/50">
              It will render below so you can select and highlight text.
            </span>
            <input type="file" accept="application/pdf" className="hidden" onChange={onFileChange} disabled={loading} />
          </label>
        )}
        {!loaded && error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div ref={containerRef} onMouseUp={onMouseUp} className="select-text" />
        {toolbar && <ColorToolbar x={toolbar.x} y={toolbar.y} onPick={applyColor} />}
      </div>

      {/* Always mounted (even before a PDF loads) so the left column's width - and therefore
          the scale pages render at - stays stable instead of shifting once this appears. */}
      <aside className="w-80 shrink-0 sticky top-8 self-start space-y-4">
        {loaded && (
          <>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 text-xs text-black/60 dark:text-white/60">
            Select text in the PDF, then pick a color:
            <div className="flex flex-wrap gap-2 mt-2">
              {HIGHLIGHT_COLORS.map((c) => (
                <span key={c.value} className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full inline-block" style={{ background: c.value }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium mb-2">
              Highlights ({highlights.length})
            </h2>
            {highlights.length === 0 ? (
              <p className="text-sm text-black/50 dark:text-white/50">None yet.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {highlights.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-md border-l-4 p-2 text-xs"
                    style={{ borderLeftColor: h.color, background: `${h.color}22` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{colorLabel(h.color)}</span>
                      <button
                        onClick={() => removeHighlight(h.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="line-clamp-3 italic">&ldquo;{h.text}&rdquo;</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting || highlights.length === 0}
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Generating…" : "Generate summary"}
          </button>
          </>
        )}
      </aside>
    </div>
  );
}
