// Copies the pdf.js worker into /public so the browser can load it same-origin,
// without depending on a CDN at runtime.
import { copyFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(root, "..", "public", "pdf.worker.min.mjs");

await copyFile(src, dest);
console.log("Copied pdf.worker.min.mjs to public/");
