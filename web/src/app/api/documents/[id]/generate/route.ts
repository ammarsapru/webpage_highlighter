import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { runGenerationPipeline } from "@/lib/pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await runGenerationPipeline(id);

  const document = await prisma.document.findUnique({
    where: { id },
    include: { highlights: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ document });
}
