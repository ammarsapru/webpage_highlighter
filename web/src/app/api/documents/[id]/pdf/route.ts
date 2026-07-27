import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { PDF_STORAGE_DIR } from "@/lib/pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document?.pdfPath) {
    return NextResponse.json({ error: "PDF not generated yet" }, { status: 404 });
  }

  const filePath = path.join(PDF_STORAGE_DIR, document.pdfPath);
  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) {
    return NextResponse.json({ error: "PDF file missing on disk" }, { status: 404 });
  }

  const safeName = document.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) || "summary";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
