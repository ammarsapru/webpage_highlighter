import { GoogleGenAI } from "@google/genai";
import type { HighlightInput, PageInput } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CHAT_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

const MAX_PAGES_PER_REWRITE = 6;
const MAX_PAGE_CONTENT_CHARS = 12000;

export async function generateHighlightRewrite(
  highlights: HighlightInput[],
  pages: PageInput[]
) {
  const pagesByUrl = new Map(pages.map((page) => [page.url, page]));

  const groups = new Map<string, HighlightInput[]>();
  for (const highlight of highlights) {
    const key = highlight.pageUrl || "unknown";
    const group = groups.get(key) || [];
    group.push(highlight);
    groups.set(key, group);
  }

  const sourceBlocks = Array.from(groups.entries())
    .slice(0, MAX_PAGES_PER_REWRITE)
    .map(([url, groupHighlights], index) => {
      const page = pagesByUrl.get(url);
      const pageTitle = page?.title || groupHighlights[0]?.pageTitle || "Untitled";

      const highlightedPassages = groupHighlights
        .map((highlight, hIndex) => {
          return `Highlight ${hIndex + 1}:\n${highlight.text}${
            highlight.userNote ? `\n(User note: ${highlight.userNote})` : ""
          }`;
        })
        .join("\n\n");

      let fullContent = page?.content || "";
      let truncationNote = "";
      if (fullContent.length > MAX_PAGE_CONTENT_CHARS) {
        fullContent = fullContent.slice(0, MAX_PAGE_CONTENT_CHARS);
        truncationNote = "\n[Source content truncated.]";
      }

      return `
SOURCE ${index + 1}
Title: ${pageTitle}
URL: ${url}

User's highlighted passages from this source, in order:
${highlightedPassages}

Full source content (use only to fill gaps and add connective context around the highlighted passages above):
${fullContent || "N/A"}${truncationNote}
`;
    })
    .join("\n---\n");

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: `Rewrite this user's highlighted passages into a single, coherent piece of writing.

Rules:
- Preserve every idea the user highlighted; do not drop any of it.
- Use the full source content only to smooth transitions and fill gaps between the highlighted passages, and to add context necessary to understand them.
- Do not introduce claims, facts, or topics that the source content does not support.
- This is not a bullet-point summary. Produce continuous, well-organized prose (with section headings only where the sources clearly span distinct topics).
- If a source's full content is unavailable, work only from its highlighted passages and note that no extra context was available for that source.

Sources:
${sourceBlocks}
`,
    config: {
      systemInstruction:
        "You rewrite a user's saved research highlights into one coherent document, filling gaps using the original source text. You never invent facts beyond what the sources support."
    }
  });

  return response.text || "";
}

export async function answerWithContext(question: string, context: string) {
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: `Question:
${question}

Saved highlight context:
${context}
`,
    config: {
      systemInstruction:
        "Answer using only the provided saved highlights. If the answer is not supported, say you could not find it in the saved highlights."
    }
  });

  return response.text || "";
}

export async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType
    }
  });

  return response.embeddings?.[0]?.values || [];
}
