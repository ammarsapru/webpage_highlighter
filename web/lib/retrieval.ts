import { getStore } from "./store";
import { embedText } from "./ai";

export async function retrieveRelevantChunks(sessionId: string, question: string) {
  const embedding = await embedText(question, "RETRIEVAL_QUERY");
  return getStore().matchChunks(sessionId, embedding, 8);
}

export function chunksToContext(chunks: Array<{ content: string; metadata?: unknown }>) {
  return chunks
    .map((chunk, index) => {
      return `CHUNK ${index + 1}\n${chunk.content}\nMetadata: ${JSON.stringify(
        chunk.metadata || {}
      )}`;
    })
    .join("\n\n---\n\n");
}
