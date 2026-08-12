# Project Instructions: Highlight Research Assistant MVP

This document explains what is currently built in this project, how the pieces connect, what is still incomplete, and what should be done next.

The goal of this project is to build a browser extension and web app that allows users to highlight text from websites, save those highlights into research sessions, summarize the session with an LLM, generate a PDF, and ask questions about the saved highlights using retrieval-augmented generation.

---

# 1. Current Project Purpose

The current MVP focuses on the core foundation:

```txt
highlight text on a webpage
  -> save highlight in extension popup
  -> send highlights to backend
  -> store session and highlights (local JSON file by default, or Supabase once configured)
  -> view session in web app
  -> generate a rewrite that fills gaps using the full source page
  -> vectorize content
  -> ask questions through a RAG endpoint
```

`web/` is a real, runnable Next.js app (`npm install && npm run dev` from inside it works immediately — no external services required to try it, thanks to the local storage fallback described in section 5.0).

This is not a finished production app yet. It is a working scaffold that gives you the core structure needed to continue development.

---

# 2. Current Folder Structure

```txt
highlight-research-assistant-mvp/
  README.md
  INSTRUCTIONS.md

  extension/
    manifest.json
    background.js
    contentScript.js
    popup.html
    popup.css
    popup.js

  web/
    app/
      dashboard/page.tsx
      sessions/[id]/page.tsx

      api/sessions/route.ts
      api/sessions/[id]/summarize/route.ts
      api/sessions/[id]/chat/route.ts
      api/sessions/[id]/generate-pdf/route.ts

    lib/
      store/
        index.ts        (getStore(): picks local vs. Supabase backend)
        localStore.ts    (default backend: JSON file under .local-data/)
        supabaseStore.ts (used once Supabase env vars are set)
        types.ts         (DataStore interface, shared record types)
      supabaseServer.ts  (lazy Supabase client, only touched by supabaseStore.ts)
      ai.ts
      retrieval.ts
      pdf.ts
      textFragment.ts

    types/
      index.ts

    package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
    eslint.config.mjs, .env.local, .gitignore

  supabase/
    schema.sql
```

---

# 3. What Is Currently In Place

## 3.1 Chrome Extension

The extension currently supports:

```txt
- detecting selected text on a webpage
- capturing the selected text
- capturing page title
- capturing page URL
- capturing nearest heading when possible
- capturing surrounding context when possible
- saving highlights locally inside chrome.storage.local
- showing saved highlights in the popup
- adding an optional user note to the saved highlight
- clearing saved local highlights
- sending a completed session to the web app backend
```

Relevant files:

```txt
extension/manifest.json
extension/contentScript.js
extension/background.js
extension/popup.html
extension/popup.css
extension/popup.js
```

---

## 3.2 Extension Manifest

File:

```txt
extension/manifest.json
```

Currently defines:

```txt
- Manifest V3 extension
- storage permission
- activeTab permission
- scripting permission
- host access to all URLs
- access to http://localhost:3000/*
- background service worker
- content script loaded on all webpages
- popup UI
```

This allows the extension to run on normal webpages and communicate with the local web app during development.

---

## 3.3 Content Script

File:

```txt
extension/contentScript.js
```

Currently handles:

```txt
- listening for mouseup events
- reading window.getSelection()
- storing the latest selected text
- trying to find surrounding page context
- trying to find a nearby heading
- sending the latest selection to the background script
- responding when popup asks for the latest selection
```

The current highlight object looks like this:

```js
{
  id: crypto.randomUUID(),
  text: selectedText,
  pageTitle: document.title,
  pageUrl: window.location.href,
  heading: getNearestHeading(selection),
  surroundingText: getSurroundingContext(selection),
  pageContent: getPageContent(),
  createdAt: new Date().toISOString()
}
```

`pageContent` is the full text of the page's `<article>`/`<main>` (or `<body>` as a fallback), capped at 15,000 characters. The popup deduplicates this per page URL before sending a session, so it is not stored once per highlight — see section 3.5.

---

## 3.4 Background Script

File:

```txt
extension/background.js
```

Currently handles:

```txt
- initializing extension storage when the extension is installed
- storing the latest selection
```

Current default storage:

```js
{
  highlights: [],
  activeSessionTitle: "Untitled Research Session"
}
```

---

## 3.5 Popup UI

Files:

```txt
extension/popup.html
extension/popup.css
extension/popup.js
```

Currently provides:

```txt
- session title input
- optional note input
- Save Current Selection button
- End Session + Send to App button
- Clear Local Highlights button
- saved highlight count
- list of saved highlights
- status messages
```

Before sending, the popup builds a deduplicated `pages` array (one entry per unique `pageUrl`, keeping the first non-empty `pageContent` seen for that URL) and strips `pageContent` off each individual highlight, so the full page text is only sent once per source page instead of once per highlight.

The popup currently sends data to:

```txt
http://localhost:3000/api/sessions
```

Request body shape: `{ title, highlights, pages }`, where `pages` is `Array<{ url, title, content }>`.

This can be changed in:

```js
const API_BASE = "http://localhost:3000";
```

inside:

```txt
extension/popup.js
```

---

# 4. Current Web App Code

The `web/` folder is a complete, runnable Next.js app (App Router, TypeScript, Tailwind v4) — `cd web && npm install && npm run dev` works on its own. See section 5.0 for how it stores data before Supabase is configured.

---

## 4.1 Dashboard Page

File:

```txt
web/app/dashboard/page.tsx
```

Currently handles:

```txt
- fetching sessions from /api/sessions
- displaying sessions as cards
- linking each card to /sessions/[id]
```

Current behavior:

```txt
/dashboard shows all saved sessions.
```

---

## 4.2 Session Detail Page

File:

```txt
web/app/sessions/[id]/page.tsx
```

Currently handles:

```txt
- reading a single session via getStore() (section 5.0)
- reading all highlights for that session
- displaying highlight cards
- displaying source title and URL
- displaying user notes
- displaying the generated rewrite ("Rewritten Notes")
- showing buttons for Generate Rewrite and Generate PDF
- linking each highlight to a "View highlight on original page" URL that uses
  the Scroll To Text Fragment spec (`#:~:text=...`, via web/lib/textFragment.ts)
  so the source page opens with that exact passage highlighted, if it still
  matches the live page
```

Important limitation:

The current buttons use normal HTML form actions pointing at API routes. In a polished app, these should be replaced with client-side buttons that call the API and refresh the UI cleanly.

---

# 5. Current Backend API Routes

## 5.0 Storage Backend

File:

```txt
web/lib/store/index.ts
```

Every route below reads/writes data through `getStore()` instead of calling Supabase directly. `getStore()` picks a backend the first time it's called in a process:

```txt
- NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY both set to real
  values -> web/lib/store/supabaseStore.ts (wraps the Supabase client from
  web/lib/supabaseServer.ts, which is now lazy: it only throws if something
  actually calls it, so importing it no longer crashes an unconfigured app)
- otherwise (the default) -> web/lib/store/localStore.ts, a JSON file at
  web/.local-data/db.json, created automatically on first write
```

Both implement the same `DataStore` interface (`web/lib/store/types.ts`): `createSession`, `listSessions`, `getSession`, `updateSessionSummary`, `insertHighlights`, `getHighlights`, `insertPages`, `getPages`, `insertChunk`, `matchChunks`, `insertChatMessages`.

Why this exists: the app needs to run with zero external setup (`npm install && npm run dev` should just work), and Supabase is expected to be replaced with a different backend later — adding a new `DataStore` implementation is the only thing a future swap should require. `localStore.ts`'s `matchChunks` does an in-process cosine-similarity scan over stored embeddings instead of pgvector, which is fine at local/dev scale but not meant for production traffic.

---

## 5.1 Create and List Sessions

File:

```txt
web/app/api/sessions/route.ts
```

Current endpoints:

```txt
POST /api/sessions
GET  /api/sessions
```

The POST endpoint currently:

```txt
- receives a title and highlights
- creates a new session row in Supabase
- inserts all highlights into Supabase
- returns the created session
```

Expected request body:

```json
{
  "title": "My Research Session",
  "highlights": [
    {
      "text": "Highlighted text",
      "pageTitle": "Page title",
      "pageUrl": "https://example.com",
      "heading": "Section heading",
      "surroundingText": "Nearby page context",
      "userNote": "Optional note",
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

Current limitation:

The user ID is hardcoded as:

```txt
00000000-0000-0000-0000-000000000000
```

This must be replaced with real authentication later.

---

## 5.2 Summarize Session

File:

```txt
web/app/api/sessions/[id]/summarize/route.ts
```

Current endpoint:

```txt
POST /api/sessions/[id]/summarize
```

Currently does:

```txt
- fetches highlights for the session
- fetches the session's stored pages (full source text, one row per unique URL)
- sends highlights grouped by source page, plus each page's full content, to the LLM
- generates a rewrite that fills gaps between highlighted passages using
  the full page content, instead of a bullet-point summary
- saves the rewrite back to the sessions table (summary column)
- creates embeddings for each highlight
- inserts embedded chunks into the chunks table
```

Current limitation:

The chunking is simple. It treats each highlight plus its surrounding context as one chunk. Later, this should become a smarter chunking pipeline.

---

## 5.3 Chat Over Session

File:

```txt
web/app/api/sessions/[id]/chat/route.ts
```

Current endpoint:

```txt
POST /api/sessions/[id]/chat
```

Expected request body:

```json
{
  "question": "What are the main ideas from this session?"
}
```

Currently does:

```txt
- embeds the user question
- searches Supabase pgvector using match_chunks()
- retrieves relevant chunks
- sends retrieved chunks and question to the LLM
- returns the answer and sources
- stores user and assistant chat messages
```

Current limitation:

There is no frontend chat UI yet. The backend route exists, but the session page only displays a placeholder message.

---

## 5.4 Generate PDF

File:

```txt
web/app/api/sessions/[id]/generate-pdf/route.ts
```

Current endpoint:

```txt
POST /api/sessions/[id]/generate-pdf
```

Currently does:

```txt
- fetches the session
- fetches highlights
- creates PDF-ready HTML
- returns the HTML in the API response
```

Important limitation:

This does not create an actual PDF file yet.

The next step is to:

```txt
1. use Puppeteer or another PDF rendering tool
2. convert the HTML into a PDF buffer
3. upload that PDF to Supabase Storage
4. save the PDF URL in sessions.pdf_url
5. show the PDF in the session page
```

---

# 6. Current AI Logic

File:

```txt
web/lib/ai.ts
```

Currently includes:

```txt
- generateHighlightRewrite()
- answerWithContext()
- embedText()
```

The current Gemini models are:

```txt
Chat model: gemini-3.6-flash
Embedding model: gemini-embedding-001
```

`embedText(text, taskType)` accepts `"RETRIEVAL_DOCUMENT"` (default, used for stored chunks) or `"RETRIEVAL_QUERY"` (used for the live chat question in `retrieval.ts`) — Gemini's embedding API is task-typed, unlike OpenAI's.

The embedding call requests `outputDimensionality: 768`, matching the database schema:

```sql
embedding vector(768)
```

Important:

If you change the embedding model or dimensionality, you may need to change the vector dimension in:

```txt
supabase/schema.sql
```

`generateHighlightRewrite(highlights, pages)` is not a bullet-point summary. It groups highlights by source page, pairs each group with that page's full stored content (from the `pages` table), and asks the model to rewrite the highlighted passages into one coherent piece of writing — using the full page only to fill gaps and add connective context, never to introduce new claims. Up to 6 distinct source pages are included per rewrite, and each page's content is truncated to ~12,000 characters, as cost/context guardrails.

---

# 7. Current Retrieval Logic

File:

```txt
web/lib/retrieval.ts
```

Currently includes:

```txt
- retrieveRelevantChunks()
- chunksToContext()
```

The retrieval pipeline is:

```txt
user question
  -> embedding
  -> Supabase match_chunks RPC
  -> retrieved chunks
  -> context string
  -> LLM answer
```

Current limitation:

This is basic vector search only.

Later, improve it with:

```txt
- hybrid search
- keyword search
- reranking
- source filters
- date filters
- page-level summaries
- session-level summaries
```

---

# 8. Current PDF Logic

File:

```txt
web/lib/pdf.ts
```

Currently includes:

```txt
createPdfHtml()
```

This function creates an HTML document with:

```txt
- title
- summary
- source list
```

This is ready to be passed into a PDF renderer, but does not yet generate a file.

---

# 9. Current Supabase Schema

File:

```txt
supabase/schema.sql
```

Currently creates:

```txt
- vector extension
- sessions table
- highlights table
- pages table
- chunks table
- chat_messages table
- pdfs table
- match_chunks RPC function
```

## 9.1 sessions

Stores research sessions.

Fields include:

```txt
id
user_id
title
description
summary
pdf_url
created_at
updated_at
```

## 9.2 highlights

Stores user-highlighted text.

Fields include:

```txt
id
session_id
user_id
text
page_title
page_url
heading
surrounding_text
user_note
created_at
```

## 9.3 pages

Stores the full text of each unique source page in a session, deduplicated by URL. Used only by `generateHighlightRewrite()` to fill gaps around the user's highlighted passages — not used for retrieval chunks.

Fields include:

```txt
id
session_id
url
title
content
created_at
```

## 9.4 chunks

Stores vectorized content for RAG.

Fields include:

```txt
id
session_id
highlight_id
content
embedding
metadata
created_at
```

## 9.5 chat_messages

Stores chat history.

Fields include:

```txt
id
session_id
user_id
role
content
sources
created_at
```

## 9.6 pdfs

Stores PDF metadata.

Fields include:

```txt
id
session_id
user_id
file_url
title
created_at
```

---

# 10. Environment Variables Needed

`web/.env.local` already exists with this shape:

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`GEMINI_API_KEY` is required for the rewrite/chat/embedding features to work regardless of storage backend.

`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are optional — leave them blank to use the local file store (section 5.0). Fill in both with real values to switch to Supabase.

Important:

Do not expose the Supabase service role key in frontend code.

It should only be used in backend/server route files.

---

# 11. What Still Needs To Be Done

## 11.1 Create Full Next.js Project Shell — DONE

`web/` now has `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs` (Tailwind v4, no separate `tailwind.config.ts` needed), `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx` (redirects to `/dashboard`), and `app/globals.css`. `cd web && npm install && npm run dev` works standalone.

---

## 11.2 Add Real Authentication

Currently, the backend uses a fake user ID.

You need to add:

```txt
- Supabase Auth
- login page
- signup page
- session checking
- protected dashboard
- owner-based data access
- extension-to-user authentication
```

This matters because every user should only see their own sessions.

Later, update the hardcoded user ID in API routes to use the authenticated user.

---

## 11.3 Connect Extension to Logged-In User

The extension currently sends directly to:

```txt
http://localhost:3000/api/sessions
```

But it does not authenticate the user.

You need one of these approaches:

```txt
Option A:
User logs into the web app, and the extension sends requests with a token.

Option B:
Extension opens the web app login page and receives an auth token.

Option C:
Extension sends data to web app local session only while the user is already logged in.
```

For MVP, Option C is probably easiest.

---

## 11.4 Improve Highlight Capture Reliability

Current highlight capture works for normal webpages, but may fail or be weak on:

```txt
- PDFs opened in browser
- Google Docs
- Notion
- websites using iframes
- websites using shadow DOM
- websites with complex dynamic rendering
- websites that block content scripts
```

Future improvements:

```txt
- allow manual save from popup
- capture selected HTML, not only text
- save DOM path or XPath
- add duplicate detection
- support screenshot capture
- support PDF page extraction separately
```

---

## 11.5 Add Better Context Extraction

Currently, surrounding context is taken from a nearby block element.

Improve by capturing:

```txt
- nearest h1/h2/h3
- previous paragraph
- selected paragraph
- next paragraph
- article title
- meta description
- canonical URL
- publication date when available
```

This will make summaries and RAG answers much better.

---

## 11.6 Add Real PDF Generation

Current route only returns HTML.

You need to implement one of these:

```txt
Option A:
Puppeteer

Option B:
React-PDF

Option C:
Playwright

Option D:
Python FastAPI + WeasyPrint / ReportLab
```

Recommended for this project:

```txt
Puppeteer
```

Reason:

```txt
- you can design the PDF as HTML/CSS
- easier to style
- works well with web app architecture
```

Needed steps:

```txt
1. npm install puppeteer
2. generate HTML using createPdfHtml()
3. render HTML to PDF buffer
4. upload PDF buffer to Supabase Storage
5. save returned URL in sessions.pdf_url
6. display PDF preview in session page
7. add download/share buttons
```

---

## 11.7 Add Supabase Storage Bucket

Create a Supabase Storage bucket named:

```txt
research-pdfs
```

Then decide whether files should be:

```txt
private
```

or

```txt
public
```

Recommended:

```txt
private bucket + signed URLs
```

This is safer for user documents.

---

## 11.8 Add Frontend Chat UI

The backend chat route exists, but the UI is not implemented.

Add a component like:

```txt
SessionChat.tsx
```

It should:

```txt
- show previous messages
- provide an input box
- send question to /api/sessions/[id]/chat
- show answer
- show sources used
- show loading state
- handle errors
```

Basic user flow:

```txt
User asks: "What were the main arguments?"
Backend retrieves chunks.
LLM answers using saved highlights.
UI displays answer and sources.
```

---

## 11.9 Improve RAG Quality

Current RAG is simple vector search.

Improve it with:

```txt
- better chunking
- chunk overlap
- hybrid vector + keyword retrieval
- reranking
- source-aware answers
- confidence scoring
- citations
- fallback to session summary for broad questions
```

Recommended retrieval flow:

```txt
question
  -> embed question
  -> vector search chunks
  -> keyword search chunks
  -> merge results
  -> rerank
  -> send top chunks to LLM
  -> answer with citations
```

---

## 11.10 Add Session Finalization Endpoint

Right now, summarization, vectorization, and PDF generation are separate.

Later, add:

```txt
POST /api/sessions/[id]/finalize
```

This route should run:

```txt
1. summarize session
2. vectorize highlights
3. generate PDF
4. save PDF
5. return final session data
```

This matches the desired "End Session" product flow.

---

## 11.11 Add Session Editing

Users should be able to:

```txt
- rename session
- delete session
- delete individual highlights
- edit notes
- regenerate summary
- regenerate PDF
```

Add API routes:

```txt
PATCH  /api/sessions/[id]
DELETE /api/sessions/[id]

PATCH  /api/highlights/[id]
DELETE /api/highlights/[id]
```

---

## 11.12 Add Sharing

Users should be able to share generated PDFs.

Possible sharing modes:

```txt
Private:
Only the owner can view.

Signed URL:
Anyone with temporary signed link can view.

Public share page:
Anyone with share link can view selected PDF/session summary.
```

Recommended:

```txt
Create a share_links table.
```

Example:

```sql
share_links
- id
- session_id
- token
- permission
- expires_at
- created_at
```

---

## 11.13 Add Better UI

Current UI is functional but basic.

Improve with:

```txt
- sidebar navigation
- search bar
- session cards
- PDF preview panel
- source list
- chat panel
- highlight filters
- loading states
- empty states
- error states
```

Recommended session page layout:

```txt
Left column:
Highlights and sources

Center:
Summary and PDF

Right column:
Chat with session
```

---

## 11.14 Add Security and RLS

Before production, enable Row Level Security.

Needed:

```txt
- enable RLS on sessions
- enable RLS on highlights
- enable RLS on chunks
- enable RLS on chat_messages
- enable RLS on pdfs
```

Policies should enforce:

```txt
user_id = auth.uid()
```

The service role key should only be used on server-side trusted routes.

---

## 11.15 Add Rate Limits

Because LLM calls cost money, add limits.

Examples:

```txt
- max highlights per session
- max sessions per user per day
- max summary generations per hour
- max chat questions per hour
- max PDF generations per day
```

---

## 11.16 Add Cost Controls

To control model usage:

```txt
- deduplicate highlights before embedding
- avoid re-embedding unchanged chunks
- cache summaries
- cache chat responses if same question is repeated
- use smaller models where possible
- limit context sent to LLM
```

---

## 11.17 Add Background Processing

For larger sessions, summarization and PDF generation may take time.

Later add:

```txt
- background job queue
- session processing status
- polling from frontend
- retry logic
```

Possible tools:

```txt
- Inngest
- Trigger.dev
- Supabase Edge Functions
- background worker
- Redis queue
```

---

# 12. Recommended Build Order From Here

Follow this order.

## Step 1: Install and Run the Web App — DONE

```bash
cd web
npm install
npm run dev
```

Goal:

```txt
/dashboard loads successfully, using the local file store — no Supabase needed yet.
```

---

## Step 2 (optional): Switch to Supabase

Only needed if you want Supabase instead of the local file store.

Run `supabase/schema.sql` in the Supabase SQL editor, then set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `web/.env.local` to real values.

Goal:

```txt
GET /api/sessions still works, now backed by Supabase instead of .local-data/db.json.
```

---

## Step 4: Load Extension

Load the extension in Chrome.

Goal:

```txt
Extension popup opens.
```

---

## Step 5: Capture Highlight Locally

Highlight text on a website and click:

```txt
Save Current Selection
```

Goal:

```txt
Popup shows saved highlight count.
```

---

## Step 6: Send Session to App

Click:

```txt
End Session + Send to App
```

Goal:

```txt
Session row appears in Supabase and session page opens.
```

---

## Step 7: Generate Rewrite

Click:

```txt
Generate Rewrite
```

Goal:

```txt
Session rewrite is saved in Supabase.
```

---

## Step 8: Confirm Embeddings

After summary generation, check:

```txt
chunks table
```

Goal:

```txt
Chunk rows with embeddings exist.
```

---

## Step 9: Test Chat Endpoint

Use Postman, Thunder Client, or curl:

```bash
curl -X POST http://localhost:3000/api/sessions/YOUR_SESSION_ID/chat \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"What is this session mainly about?\"}"
```

Goal:

```txt
You receive an LLM answer using retrieved chunks.
```

---

## Step 10: Build Chat UI

Create a frontend chat component.

Goal:

```txt
User can ask questions from the session page.
```

---

## Step 11: Implement Real PDF Generation

Use Puppeteer and Supabase Storage.

Goal:

```txt
User can view, download, and share a generated PDF.
```

---

# 13. Known Current Weaknesses

The current MVP has these weaknesses:

```txt
- no real authentication
- fake user_id
- no RLS policies enabled (only relevant once Supabase is configured)
- local file store is single-user/dev-only, not for concurrent production use
- no real PDF file generation yet
- no Supabase Storage (or equivalent) upload yet
- no frontend chat UI yet
- local store's vector search is a linear cosine-similarity scan, not indexed
- basic chunking only
- no source citation formatting in frontend
- no share-link system
- no extension auth token
- no production error handling
- no deployment configuration
```

These are expected for the current scaffold.

---

# 14. What The MVP Already Proves

Even with the limitations, the current scaffold proves the core architecture:

```txt
browser extension can capture highlights
extension can store local session data
extension can send data to web backend
web backend can store session data
LLM can summarize saved highlights
highlights can be embedded
RAG endpoint can answer over saved highlights
PDF-ready HTML can be generated
```

That is the correct foundation.

---

# 15. Suggested Production Architecture

Final production architecture should be:

```txt
Chrome Extension
  -> captures highlights and context
  -> sends authenticated session data

Next.js Web App
  -> dashboard
  -> session viewer
  -> PDF viewer
  -> chat interface
  -> sharing interface

Supabase
  -> Auth
  -> Postgres
  -> pgvector
  -> Storage
  -> RLS policies

LLM API
  -> summaries
  -> embeddings
  -> RAG answers

PDF Renderer
  -> HTML to PDF
  -> upload to storage
```

---

# 16. Immediate Next Task Recommendation

The next best task is:

```txt
Create the full Next.js app shell and copy the current web files into it.
```

After that, get this flow working:

```txt
highlight text
  -> save in popup
  -> send to backend
  -> view session in dashboard
```

Do not start with advanced RAG or PDF styling first. Make the capture and storage loop reliable before adding complexity.
