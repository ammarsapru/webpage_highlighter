# Highlight Vault — web app

Next.js (App Router) dashboard + API for the Highlight Vault extension. See the
[repo root README](../README.md) for the full picture (extension + web app together).

## Setup

```bash
npm install                # also copies the pdf.js worker into public/ (postinstall)
cp .env.example .env       # edit DASHBOARD_PASSWORD, SESSION_SECRET, OPENROUTER_API_KEY
npx prisma migrate deploy  # create the SQLite database
npm run dev                # http://localhost:3000
```

On first login, go to **Settings** and click **Generate token** — paste that token plus this
server's URL into the extension's options page.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build/run
- `npm run lint` — ESLint
- `npx prisma studio` — browse the SQLite database

## Layout

- `src/app/api/*` — REST endpoints used by both the dashboard and the extension
- `src/app/(app)/*` — the authenticated dashboard (documents list, detail/summary view,
  PDF upload + highlighter, settings)
- `src/lib/pipeline.ts` — orchestrates a document: call OpenRouter, render HTML, render PDF
- `src/lib/openrouter.ts` — prompt + call to OpenRouter's chat completions API
- `src/lib/pdf.ts` / `src/lib/render-summary.ts` — HTML → PDF via headless Chromium
- `prisma/schema.prisma` — `Document`, `Highlight`, `Settings`
