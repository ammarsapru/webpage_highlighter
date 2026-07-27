import { NextResponse } from "next/server";
import { requireSession, rotateApiToken } from "@/lib/auth";

export async function POST() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await rotateApiToken();

  return NextResponse.json({ token });
}
