async function getSessions() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/sessions`, {
    cache: "no-store"
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.sessions || [];
}

export default async function DashboardPage() {
  const sessions = await getSessions();

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Research Sessions</h1>
        <p className="mt-2 text-slate-600">
          Saved highlight sessions from your browser extension.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sessions.map((session: any) => (
            <a
              key={session.id}
              href={`/sessions/${session.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{session.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                {session.summary || "No summary generated yet."}
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Created {new Date(session.created_at).toLocaleString()}
              </p>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
