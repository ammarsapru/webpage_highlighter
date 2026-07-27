import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import { colorLabel } from "@/lib/colors";
import DocumentActions from "@/components/DocumentActions";
import DocumentAutoRefresh from "@/components/DocumentAutoRefresh";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { highlights: { orderBy: { position: "asc" } } },
  });

  if (!document) notFound();

  return (
    <div>
      {(document.status === "pending" || document.status === "processing") && (
        <DocumentAutoRefresh />
      )}

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        <StatusBadge status={document.status} />
      </div>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        {document.sourceType === "pdf" ? "Uploaded PDF" : document.sourceUrl} &middot;{" "}
        {new Date(document.createdAt).toLocaleString()}
        {document.model ? ` · ${document.model}` : ""}
      </p>

      <DocumentActions id={document.id} hasPdf={Boolean(document.pdfPath)} />

      {document.status === "error" && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-medium mb-1">Summary generation failed</p>
          <p>{document.errorMessage}</p>
        </div>
      )}

      {document.status === "done" && document.summaryHtml ? (
        <div
          className="mt-8 [&_.summary]:max-w-none [&_.summary]:p-0"
          dangerouslySetInnerHTML={{ __html: document.summaryHtml }}
        />
      ) : document.status !== "error" ? (
        <div className="mt-10">
          <h2 className="text-lg font-medium mb-3">Highlights</h2>
          <ul className="space-y-3">
            {document.highlights.map((h) => (
              <li
                key={h.id}
                className="rounded-md border-l-4 p-3 text-sm"
                style={{ borderLeftColor: h.color, background: `${h.color}22` }}
              >
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 mb-1"
                  style={{ background: h.color }}
                >
                  {colorLabel(h.color)}
                </span>
                <p className="italic">&ldquo;{h.text}&rdquo;</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-black/50 dark:text-white/50 mt-4">
            Generating your summary — this page will refresh automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}
