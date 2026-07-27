import { prisma } from "@/lib/prisma";
import { generateSummary } from "@/lib/openrouter";
import { buildSummaryHtml } from "@/lib/render-summary";
import { renderSummaryPdf } from "@/lib/pdf";

export async function resolveOpenRouterConfig(): Promise<{ apiKey: string; model: string } | null> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const apiKey = settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
  const model = settings?.openRouterModel || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  if (!apiKey) return null;
  return { apiKey, model };
}

/**
 * Runs the full LLM summary + PDF pipeline for a document, updating its status as it goes.
 * Never throws - failures are recorded on the document itself (status=error, errorMessage).
 */
export async function runGenerationPipeline(documentId: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "processing", errorMessage: null },
  });

  try {
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { highlights: { orderBy: { position: "asc" } } },
    });

    const config = await resolveOpenRouterConfig();
    if (!config) {
      throw new Error(
        "No OpenRouter API key configured. Add one on the Settings page or set OPENROUTER_API_KEY."
      );
    }

    const highlightInputs = document.highlights.map((h, i) => ({
      index: i,
      text: h.text,
      color: h.color,
    }));

    const summary = await generateSummary({
      documentTitle: document.title,
      pageContent: document.pageContent,
      highlights: highlightInputs,
      apiKey: config.apiKey,
      model: config.model,
    });

    const summaryHtml = buildSummaryHtml({
      title: document.title,
      sourceUrl: document.sourceUrl,
      generatedAt: new Date(),
      summary,
      highlights: document.highlights.map((h, i) => ({
        index: i,
        text: h.text,
        color: h.color,
        note: h.note,
      })),
    });

    const pdfFilename = await renderSummaryPdf(document.id, summaryHtml);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "done",
        summaryHtml,
        pdfPath: pdfFilename,
        model: config.model,
      },
    });
  } catch (err) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unknown error while generating summary",
      },
    });
  }
}
