import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { createPdfHtml } from "@/lib/pdf";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const store = getStore();

    const session = await store.getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const highlights = await store.getHighlights(id);

    const html = createPdfHtml({
      title: session.title,
      summary: session.summary || "No summary generated yet.",
      sources: highlights.map((h) => ({
        title: h.page_title ?? undefined,
        url: h.page_url ?? undefined
      }))
    });

    // MVP:
    // This returns HTML that can be rendered as PDF later.
    // Next step: use Puppeteer to turn this HTML into a PDF buffer,
    // then upload it to Supabase Storage (or another storage backend)
    // and save pdf_url.
    return NextResponse.json({
      message: "PDF HTML generated. Add Puppeteer upload step next.",
      html
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
