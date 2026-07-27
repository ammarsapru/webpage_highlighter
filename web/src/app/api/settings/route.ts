import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return NextResponse.json({
    hasApiToken: Boolean(settings),
    hasOpenRouterKey: Boolean(settings?.openRouterApiKey || process.env.OPENROUTER_API_KEY),
    openRouterModel: settings?.openRouterModel || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  });
}

const updateSchema = z.object({
  openRouterApiKey: z.string().optional(),
  openRouterModel: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const openRouterApiKey =
    parsed.data.openRouterApiKey !== undefined ? parsed.data.openRouterApiKey || null : undefined;
  const openRouterModel = parsed.data.openRouterModel;

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(openRouterApiKey !== undefined ? { openRouterApiKey } : {}),
      ...(openRouterModel !== undefined ? { openRouterModel } : {}),
    },
    create: {
      id: 1,
      openRouterApiKey: openRouterApiKey ?? null,
      ...(openRouterModel !== undefined ? { openRouterModel } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
