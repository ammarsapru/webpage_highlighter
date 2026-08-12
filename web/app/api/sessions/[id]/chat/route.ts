import { NextResponse } from "next/server";
import { answerWithContext } from "@/lib/ai";
import { chunksToContext, retrieveRelevantChunks } from "@/lib/retrieval";
import { getStore } from "@/lib/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const chunks = await retrieveRelevantChunks(id, question);
    const retrievedContext = chunksToContext(chunks);
    const answer = await answerWithContext(question, retrievedContext);

    await getStore().insertChatMessages([
      { sessionId: id, role: "user", content: question },
      { sessionId: id, role: "assistant", content: answer, sources: chunks }
    ]);

    return NextResponse.json({ answer, sources: chunks });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}
