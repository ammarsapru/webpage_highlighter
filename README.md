# Highlight Vault

Highlight text on any webpage (via a browser extension) or in a PDF (via the dashboard's
built-in viewer), in five different colors. Each set of highlights, plus the surrounding
page/document content for context, is sent through an LLM on [OpenRouter](https://openrouter.ai)
which explains each highlight in more depth and fills in the gaps using that context — all
without altering the highlighted text itself. The result is compiled into a downloadable PDF,
and every document you've captured lives in a dashboard where you can browse, re-generate, or
delete it.

The project has two parts that talk to each other over a small REST API:

- **`extension/`** — a Manifest V3 browser extension (Chrome/Edge/Brave/etc.) that lets you
  select text on any page, pick a highlight color, and submit the highlights.
- **`web/`** — a Next.js app: the dashboard (documents list, summary view, PDF upload +
  highlighter, settings) and the API the extension talks to.

## How it fits together

```
 ┌─────────────────┐   highlights + page text    ┌───────────────────────┐
 │ Browser extension│ ───────────────────────────▶│  POST /api/documents  │
 │ (any webpage)    │   (Bearer API token)        │                       │
 └─────────────────┘                              │  Next.js app (web/)   │
                                                    │  ├─ SQLite (Prisma)   │
 ┌─────────────────┐   highlights + PDF text       │  ├─ OpenRouter call   │
 │ Dashboard's PDF  │ ─────────────────────────────▶│  └─ Puppeteer → PDF   │
 │ upload/highlighter (session cookie)             │                       │
 └─────────────────┘                              └───────────┬───────────┘
                                                                │
                                                    Dashboard: browse, download PDF,
                                                    re-generate, delete
```

## 1. Run the web app

```bash
cd web
npm install
cp .env.example .env
```

Edit `.env`:

- `DASHBOARD_PASSWORD` — the password you'll use to log into the dashboard.
- `SESSION_SECRET` — any long random string (signs the login session cookie).
- `OPENROUTER_API_KEY` — from https://openrouter.ai/keys. You can leave this blank and set it
  later from the dashboard's Settings page instead.
- `OPENROUTER_MODEL` — defaults to `openai/gpt-4o-mini`; any OpenRouter model id works.

Then:

```bash
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000, log in with `DASHBOARD_PASSWORD`, and go to **Settings** →
**Generate token**. Copy that token — it's only shown once.

For a real deployment, run `npm run build && npm run start` on a server you control (a VPS,
a home server, etc.). The summary/PDF pipeline runs Puppeteer (headless Chromium) and writes
files to `web/storage/pdfs/`, so it needs a persistent, long-running Node process — not a
one-shot serverless function.

## 2. Load the extension

1. Go to `chrome://extensions` (or the equivalent in your Chromium-based browser).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the extension's icon → **Settings**, and enter:
   - **Server URL**: where the web app is running (e.g. `http://localhost:3000`, or your
     deployed URL).
   - **API token**: the one you generated in the dashboard's Settings page.

## 3. Highlight something

**On a webpage:** select text, a small color toolbar appears above the selection — pick a
color. Open the extension popup to see everything you've highlighted on the current page,
give the document a title, and click **Save & summarize**. It's sent to your server, run
through the LLM, turned into a PDF, and you're taken straight to it in the dashboard.

**In a PDF:** on the dashboard, go to **Upload a PDF**, choose a file, select text in the
rendered pages the same way, and click **Generate summary**.

Highlight colors and what they're meant to represent (used to prompt the LLM, and shown as
labels in the summary):

| Color | Meaning |
| --- | --- |
| 🟡 Yellow | Key point |
| 🟢 Green | Evidence |
| 🔵 Blue | Definition |
| 🩷 Pink | Question |
| 🟠 Orange | Action item |

## Notes & limitations

- **Single user.** There's no multi-account system — one dashboard password, one API token,
  one OpenRouter key. This is meant to be self-hosted for personal use, not deployed as a
  public multi-tenant service.
- **Highlights aren't persisted until you save.** Reloading a page (or the PDF viewer) before
  clicking "Save & summarize" clears the in-progress highlights on that page — submit before
  navigating away.
- **Document context is truncated** to roughly the first 40,000 characters before being sent
  to the LLM, to keep prompts within typical context-window/cost limits. Very long
  pages/PDFs will have highlights near the end explained with less surrounding context.
- **Puppeteer needs a full Chromium** to render PDFs; if you deploy somewhere Chromium isn't
  preinstalled, `npm install` (in `web/`) downloads one for you via the `puppeteer` package.

## Repo layout

```
extension/     Manifest V3 browser extension (content script, popup, options page)
web/           Next.js dashboard + API + PDF/LLM pipeline (see web/README.md)
```
