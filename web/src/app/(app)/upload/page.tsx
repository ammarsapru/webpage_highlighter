import PdfHighlighter from "@/components/PdfHighlighter";

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Upload a PDF</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        Select text in the document and pick a highlight color, then generate a summary.
      </p>
      <PdfHighlighter />
    </div>
  );
}
