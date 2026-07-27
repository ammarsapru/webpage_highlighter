import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { highlights: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your documents</h1>
        <Link
          href="/upload"
          className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
        >
          + Upload a PDF
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/20 p-12 text-center text-black/60 dark:text-white/60">
          <p className="mb-2 font-medium">No documents yet</p>
          <p className="text-sm">
            Install the browser extension, highlight some text on any webpage, and hit
            &ldquo;Save &amp; Summarize&rdquo; — it will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
                <p className="font-medium truncate">{doc.title}</p>
                <p className="text-xs text-black/50 dark:text-white/50 truncate mt-0.5">
                  {doc.sourceType === "pdf" ? "PDF" : doc.sourceUrl ?? "Webpage"} &middot;{" "}
                  {doc._count.highlights} highlight{doc._count.highlights === 1 ? "" : "s"} &middot;{" "}
                  {new Date(doc.createdAt).toLocaleString()}
                </p>
              </Link>
              <StatusBadge status={doc.status} />
              <DeleteDocumentButton id={doc.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
