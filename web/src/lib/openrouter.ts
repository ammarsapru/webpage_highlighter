import { z } from "zod";
import { colorLabel } from "@/lib/colors";

const MAX_CONTEXT_CHARS = 40_000;

export interface HighlightInput {
  index: number;
  text: string;
  color: string;
}

export interface SummaryResult {
  title: string;
  overview: string;
  keyTakeaways: string[];
  explanations: Record<number, string>; // highlight index -> explanation
}

const llmResponseSchema = z.object({
  title: z.string(),
  overview: z.string(),
  keyTakeaways: z.array(z.string()),
  sections: z.array(
    z.object({
      index: z.number(),
      explanation: z.string(),
    })
  ),
});

function buildPrompt(
  documentTitle: string,
  pageContent: string,
  highlights: HighlightInput[]
): { system: string; user: string } {
  const truncatedContext =
    pageContent.length > MAX_CONTEXT_CHARS
      ? `${pageContent.slice(0, MAX_CONTEXT_CHARS)}\n\n[...content truncated...]`
      : pageContent;

  const highlightList = highlights
    .map(
      (h) =>
        `${h.index}. [${colorLabel(h.color)}] "${h.text.replace(/"/g, '\\"')}"`
    )
    .join("\n");

  const system = `You are an expert research assistant that turns a reader's highlights into a polished study summary.
You will receive the full text of a document/webpage for context, and a numbered list of passages the reader
highlighted, each tagged with the category its color represents (Key point, Evidence, Definition, Question, or
Action item).

For every numbered highlight, write a short explanation (2-5 sentences) that:
- Clarifies the passage in plain language and adds relevant context found ONLY in the supplied document content.
- Fills in gaps a reader might have (define jargon, connect it to nearby ideas) without inventing facts that are
  not supported by the document.
- If the category is "Question", try to answer it using the document content when possible.
Never quote or restate the highlighted passage itself in your explanation - only add new context/explanation, since the
original passage will be shown next to your text.

Also produce:
- "title": a clean, descriptive title for this summary (improve on the raw page title if useful).
- "overview": a 2-4 sentence summary of what the whole document/page is about.
- "keyTakeaways": 3-6 bullet-point strings synthesizing the most important ideas across ALL highlights.

Respond with ONLY a single JSON object, no markdown fences, matching exactly this shape:
{"title": string, "overview": string, "keyTakeaways": string[], "sections": [{"index": number, "explanation": string}]}`;

  const user = `DOCUMENT TITLE: ${documentTitle}

DOCUMENT CONTENT (for context):
"""
${truncatedContext}
"""

HIGHLIGHTED PASSAGES:
${highlightList}`;

  return { system, user };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("LLM response was not valid JSON");
  }
}

export async function generateSummary(params: {
  documentTitle: string;
  pageContent: string;
  highlights: HighlightInput[];
  apiKey: string;
  model: string;
}): Promise<SummaryResult> {
  const { documentTitle, pageContent, highlights, apiKey, model } = params;
  const { system, user } = buildPrompt(documentTitle, pageContent, highlights);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Highlight Vault",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter response had no content");

  const parsed = llmResponseSchema.parse(extractJson(content));

  const explanations: Record<number, string> = {};
  for (const section of parsed.sections) {
    explanations[section.index] = section.explanation;
  }

  return {
    title: parsed.title,
    overview: parsed.overview,
    keyTakeaways: parsed.keyTakeaways,
    explanations,
  };
}
