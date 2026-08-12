import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { generateHighlightRewrite, embedText } from "@/lib/ai";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const store = getStore();

    const highlights = await store.getHighlights(id);
    const pages = await store.getPages(id);

    const normalizedHighlights = highlights.map((h) => ({
      text: h.text,
      pageTitle: h.page_title ?? undefined,
      pageUrl: h.page_url ?? undefined,
      heading: h.heading ?? undefined,
      surroundingText: h.surrounding_text ?? undefined,
      userNote: h.user_note ?? undefined,
      createdAt: h.created_at
    }));

    const normalizedPages = pages.map((p) => ({
      url: p.url,
      title: p.title ?? undefined,
      content: p.content
    }));

    const summary = await generateHighlightRewrite(normalizedHighlights, normalizedPages);

    await store.updateSessionSummary(id, summary);

    // Simple vectorization pass.
    // Later replace this with smarter chunking.
    for (const highlight of highlights) {
      const content = [highlight.text, highlight.surrounding_text, highlight.user_note]
        .filter(Boolean)
        .join("\n\n");

      if (!content.trim()) continue;

      const embedding = await embedText(content);

      await store.insertChunk({
        sessionId: id,
        highlightId: highlight.id,
        content,
        embedding,
        metadata: {
          pageTitle: highlight.page_title,
          pageUrl: highlight.page_url,
          heading: highlight.heading
        }
      });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to summarize session" },
      { status: 500 }
    );
  }
}
