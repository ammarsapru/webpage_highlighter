import path from "path";
import { mkdir } from "fs/promises";
import puppeteer from "puppeteer";
import { SUMMARY_STYLES } from "@/lib/render-summary";

export const PDF_STORAGE_DIR = path.join(process.cwd(), "storage", "pdfs");

export async function renderSummaryPdf(documentId: string, summaryHtml: string): Promise<string> {
  await mkdir(PDF_STORAGE_DIR, { recursive: true });

  const fullHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${SUMMARY_STYLES}</style>
  </head>
  <body>${summaryHtml}</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    const filename = `${documentId}.pdf`;
    const filePath = path.join(PDF_STORAGE_DIR, filename);
    await page.pdf({
      path: filePath,
      format: "a4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "0px", right: "0px" },
    });
    return filename;
  } finally {
    await browser.close();
  }
}
