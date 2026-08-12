// MVP placeholder.
//
// Production options:
// 1. Use Puppeteer to render HTML to PDF.
// 2. Upload the generated PDF buffer to Supabase Storage.
// 3. Save the public/signed URL in sessions.pdf_url.

export function createPdfHtml(params: {
  title: string;
  summary: string;
  sources: Array<{ title?: string; url?: string }>;
}) {
  const sourceItems = params.sources
    .map(
      (source) =>
        `<li><strong>${escapeHtml(source.title || "Untitled")}</strong><br/>${escapeHtml(
          source.url || ""
        )}</li>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(params.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 48px; line-height: 1.6; color: #111827; }
    h1 { font-size: 28px; }
    h2 { margin-top: 32px; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <h1>${escapeHtml(params.title)}</h1>
  <p>Generated research summary.</p>

  <h2>Summary</h2>
  <pre>${escapeHtml(params.summary)}</pre>

  <h2>Sources</h2>
  <ul>${sourceItems}</ul>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
