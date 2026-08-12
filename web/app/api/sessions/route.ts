import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { SessionInput } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SessionInput;

    if (!body.title || !Array.isArray(body.highlights)) {
      return NextResponse.json(
        { error: "title and highlights are required" },
        { status: 400 }
      );
    }

    // MVP note:
    // Replace this with the real authenticated user's id later.
    const userId = "00000000-0000-0000-0000-000000000000";

    const store = getStore();

    const session = await store.createSession({ userId, title: body.title });

    await store.insertHighlights(session.id, userId, body.highlights);

    if (Array.isArray(body.pages) && body.pages.length > 0) {
      await store.insertPages(session.id, body.pages);
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sessions = await getStore().listSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
