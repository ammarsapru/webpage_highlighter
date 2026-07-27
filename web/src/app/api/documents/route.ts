import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { runGenerationPipeline } from "@/lib/pipeline";

const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  sourceType: z.enum(["webpage", "pdf"]).default("webpage"),
  sourceUrl: z.string().url().optional().nullable(),
  pageContent: z.string().min(1),
  highlights: z
    .array(
      z.object({
        text: z.string().min(1),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        note: z.string().optional().nullable(),
        position: z.number().int().optional(),
      })
    )
    .min(1, "At least one highlight is required"),
});

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { highlights: true } } },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const document = await prisma.document.create({
    data: {
      title: data.title,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl ?? null,
      pageContent: data.pageContent,
      highlights: {
        create: data.highlights.map((h, i) => ({
          text: h.text,
          color: h.color,
          note: h.note ?? null,
          position: h.position ?? i,
        })),
      },
    },
    include: { highlights: true },
  });

  await runGenerationPipeline(document.id);

  const final = await prisma.document.findUnique({
    where: { id: document.id },
    include: { highlights: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ document: final }, { status: 201 });
}
