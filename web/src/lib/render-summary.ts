import { escapeHtml } from "@/lib/html-escape";
import { colorLabel } from "@/lib/colors";
import type { SummaryResult } from "@/lib/openrouter";

export interface HighlightForRender {
  index: number;
  text: string;
  color: string;
  note: string | null;
}

/**
 * Renders the compiled summary as a self-contained HTML fragment (not a full document).
 * Used both for the in-dashboard preview (dangerouslySetInnerHTML) and, wrapped in a full
 * page shell, for the generated PDF - so both surfaces always stay visually in sync.
 * All dynamic text is escaped here since it originates from arbitrary web pages/PDFs.
 */
export function buildSummaryHtml(params: {
  title: string;
  sourceUrl: string | null;
  generatedAt: Date;
  summary: SummaryResult;
  highlights: HighlightForRender[];
}): string {
  const { title, sourceUrl, generatedAt, summary, highlights } = params;

  const dateStr = generatedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sections = highlights
    .map((h) => {
      const explanation = summary.explanations[h.index];
      return `
        <section class="highlight-block">
          <div class="highlight-passage" style="border-left-color: ${escapeHtml(h.color)}; background: ${escapeHtml(h.color)}22;">
            <span class="highlight-tag" style="background: ${escapeHtml(h.color)};">${escapeHtml(colorLabel(h.color))}</span>
            <p class="highlight-text">&ldquo;${escapeHtml(h.text)}&rdquo;</p>
            ${h.note ? `<p class="highlight-note">Note: ${escapeHtml(h.note)}</p>` : ""}
          </div>
          ${explanation ? `<p class="highlight-explanation">${escapeHtml(explanation)}</p>` : ""}
        </section>`;
    })
    .join("\n");

  const takeaways = summary.keyTakeaways
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join("\n");

  return `
    <article class="summary">
      <header class="summary-header">
        <h1>${escapeHtml(summary.title || title)}</h1>
        <p class="summary-meta">
          ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a> &middot; ` : ""}Generated ${escapeHtml(dateStr)}
        </p>
        <p class="summary-overview">${escapeHtml(summary.overview)}</p>
      </header>

      <section class="takeaways">
        <h2>Key takeaways</h2>
        <ul>${takeaways}</ul>
      </section>

      <h2>Highlights</h2>
      ${sections}
    </article>`;
}

// Scoped entirely under .summary (never bare `body`/`h2`/etc.) so this can be safely
// injected as-is into the dashboard page, which already has its own global styles.
export const SUMMARY_STYLES = `
  .summary, .summary * { box-sizing: border-box; }
  .summary {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.55;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 32px;
  }
  .summary-header h1 { font-size: 28px; margin: 0 0 8px; }
  .summary-meta { font-size: 13px; color: #666; margin: 0 0 16px; }
  .summary-meta a { color: #666; }
  .summary-overview { font-size: 16px; color: #333; margin: 0 0 8px; }
  .summary .takeaways { background: #f7f7f8; border-radius: 10px; padding: 20px 24px; margin: 24px 0 32px; }
  .summary .takeaways h2 { margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
  .summary .takeaways ul { margin: 0; padding-left: 20px; }
  .summary .takeaways li { margin-bottom: 6px; }
  .summary h2 { font-size: 20px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
  .summary .highlight-block { margin-bottom: 28px; page-break-inside: avoid; }
  .highlight-passage {
    border-left: 4px solid;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 8px;
    position: relative;
  }
  .highlight-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1a1a1a;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 6px;
  }
  .highlight-text { font-style: italic; margin: 0; font-size: 15px; }
  .highlight-note { font-size: 13px; color: #555; margin: 6px 0 0; }
  .highlight-explanation { margin: 0 0 0 4px; color: #2a2a2a; font-size: 15px; }
`;
