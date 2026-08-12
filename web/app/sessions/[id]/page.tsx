import { getStore } from "@/lib/store";
import { buildHighlightUrl } from "@/lib/textFragment";

async function getSession(id: string) {
  const store = getStore();
  const session = await store.getSession(id);
  const highlights = session ? await store.getHighlights(id) : [];

  return { session, highlights };
}

export default async function SessionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, highlights } = await getSession(id);

  if (!session) {
    return <main className="p-8">Session not found.</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-blue-600">
          ← Back to dashboard
        </a>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{session.title}</h1>
            <p className="mt-2 text-slate-600">
              {highlights.length} highlights saved.
            </p>
          </div>

          <div className="flex gap-2">
            <form action={`/api/sessions/${id}/summarize`} method="post">
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Generate Rewrite
              </button>
            </form>

            <form action={`/api/sessions/${id}/generate-pdf`} method="post">
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Generate PDF
              </button>
            </form>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Highlights</h2>

            {highlights.map((highlight: any) => (
              <article
                key={highlight.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-500">
                  {highlight.page_title || "Untitled page"}
                </div>

                {highlight.heading && (
                  <div className="mt-1 text-xs text-slate-400">
                    Heading: {highlight.heading}
                  </div>
                )}

                <p className="mt-3 whitespace-pre-wrap text-slate-900">
                  {highlight.text}
                </p>

                {highlight.user_note && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    Note: {highlight.user_note}
                  </p>
                )}

                {highlight.page_url && (
                  <div className="mt-3">
                    <a
                      href={buildHighlightUrl(highlight.page_url, highlight.text)}
                      target="_blank"
                      className="block text-sm text-blue-600"
                    >
                      View highlight on original page
                    </a>
                    <p className="mt-1 text-xs text-slate-400">
                      Re-highlights this passage on the live page if it hasn&apos;t
                      changed since you saved it.
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Rewritten Notes</h2>
            <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {session.summary || "Click Generate Rewrite to create one."}
            </pre>

            <div className="mt-8">
              <h2 className="text-xl font-semibold">Ask This Session</h2>
              <p className="mt-2 text-sm text-slate-500">
                Wire this form to the chat API next. Endpoint already exists:
                /api/sessions/{id}/chat
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
