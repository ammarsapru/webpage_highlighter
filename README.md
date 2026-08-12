# Highlight Research Assistant MVP

This project is a working browser-extension + web-app system that lets users:

1. Highlight text on webpages.
2. Save highlights into a session.
3. Send the session to a web app.
4. Store highlights locally (no setup) or in Supabase, once configured.
5. Generate a rewrite that stitches the highlighted passages into one coherent piece, filling gaps using the full source page.
6. Generate a PDF placeholder.
7. Ask questions over saved highlights using a basic retrieval flow.
8. Jump from a saved highlight back to the exact passage on the original page.

This is intentionally an MVP foundation. The first goal is to make the capture → store → display loop work reliably.

`web/` is now a real, runnable Next.js app (not just route/lib files to copy elsewhere) — see Phase 2.

---

## Project Structure

```txt
highlight-research-assistant-mvp/
  extension/
    manifest.json
    contentScript.js
    background.js
    popup.html
    popup.js
    popup.css

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
        index.ts        (picks local vs. Supabase backend)
        localStore.ts    (default: JSON file under .local-data/)
        supabaseStore.ts
        types.ts         (DataStore interface)
      supabaseServer.ts
      ai.ts
      pdf.ts
      retrieval.ts
      textFragment.ts
    types/
      index.ts
    package.json, tsconfig.json, next.config.ts, etc.

  supabase/
    schema.sql
```

---

## Phase 1: Run the Extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the `extension/` folder.
6. Open any webpage.
7. Highlight text.
8. Open the extension popup.
9. Click **Save Current Selection**.

The popup stores highlights locally using `chrome.storage.local`.

---

## Phase 2: Run the Web App

`web/` is a ready-to-run Next.js app.

```bash
cd web
npm install
```

Edit `web/.env.local` (already created) and set your Gemini key:

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Leave blank to use the built-in local file store (see Phase 3).
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional later for PDF generation:

```bash
npm install puppeteer
```

Run:

```bash
npm run dev
```

`/dashboard` should now load with zero other setup.

---

## Phase 3: Storage — local by default, Supabase when you want it

The app picks its storage backend at request time, via `web/lib/store/index.ts`:

- **`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` blank or unset (default):** everything is stored in a single JSON file at `web/.local-data/db.json`, created automatically on first write. No external service needed — this is what makes `npm run dev` work immediately after `npm install`.
- **Both set to real values:** the app uses Supabase instead. Create the tables first:

  ```sql
  -- paste contents of supabase/schema.sql into the Supabase SQL editor
  ```

Both backends implement the same `DataStore` interface (`web/lib/store/types.ts`), so switching is just setting those two env vars — no code changes. This also means swapping to a different backend later (anything other than Supabase) only requires writing one new file that implements `DataStore`, alongside `localStore.ts` and `supabaseStore.ts`.

The local file store is fine for trying the app out or single-user local development; it is not meant for concurrent multi-user use.

---

## Current MVP Behavior

The extension currently sends highlights to:

```txt
http://localhost:3000/api/sessions
```

You can change this in:

```txt
extension/popup.js
```

Search for:

```js
const API_BASE = "http://localhost:3000";
```

---

## Next Improvements

1. Add real authentication.
2. Link extension user to web app account.
3. Add better surrounding context extraction.
4. Add embeddings with pgvector.
5. Add Supabase Storage PDF upload.
6. Add source citations in chat answers.
7. Add share links with permissions.
