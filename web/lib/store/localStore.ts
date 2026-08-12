import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { HighlightInput, PageInput, RetrievedChunk } from "@/types";
import type {
  ChatMessageRecord,
  DataStore,
  HighlightRecord,
  InsertChatMessageInput,
  InsertChunkInput,
  PageRecord,
  SessionRecord
} from "./types";

type ChunkRow = {
  id: string;
  session_id: string;
  highlight_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
};

type Db = {
  sessions: SessionRecord[];
  highlights: HighlightRecord[];
  pages: PageRecord[];
  chunks: ChunkRow[];
  chatMessages: ChatMessageRecord[];
};

const DB_DIR = path.join(process.cwd(), ".local-data");
const DB_FILE = path.join(DB_DIR, "db.json");

const emptyDb: Db = {
  sessions: [],
  highlights: [],
  pages: [],
  chunks: [],
  chatMessages: []
};

// Local dev has one process reading/writing the file; a simple promise
// chain keeps concurrent requests from racing on the read-modify-write.
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => undefined);
  return result;
}

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return { ...emptyDb, ...JSON.parse(raw) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...emptyDb };
    }
    throw error;
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createLocalStore(): DataStore {
  return {
    async createSession({ userId, title }) {
      return withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();

        const session: SessionRecord = {
          id: randomUUID(),
          user_id: userId,
          title,
          description: null,
          summary: null,
          pdf_url: null,
          created_at: now,
          updated_at: now
        };

        db.sessions.push(session);
        await writeDb(db);
        return session;
      });
    },

    async listSessions() {
      const db = await readDb();
      return [...db.sessions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    async getSession(id) {
      const db = await readDb();
      return db.sessions.find((session) => session.id === id) || null;
    },

    async updateSessionSummary(id, summary) {
      await withLock(async () => {
        const db = await readDb();
        const session = db.sessions.find((s) => s.id === id);
        if (!session) return;
        session.summary = summary;
        session.updated_at = new Date().toISOString();
        await writeDb(db);
      });
    },

    async insertHighlights(sessionId, userId, highlights: HighlightInput[]) {
      await withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();

        for (const highlight of highlights) {
          db.highlights.push({
            id: randomUUID(),
            session_id: sessionId,
            user_id: userId,
            text: highlight.text,
            page_title: highlight.pageTitle || null,
            page_url: highlight.pageUrl || null,
            heading: highlight.heading || null,
            surrounding_text: highlight.surroundingText || null,
            user_note: highlight.userNote || null,
            created_at: highlight.createdAt || now
          });
        }

        await writeDb(db);
      });
    },

    async getHighlights(sessionId) {
      const db = await readDb();
      return db.highlights
        .filter((h) => h.session_id === sessionId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    async insertPages(sessionId, pages: PageInput[]) {
      if (pages.length === 0) return;

      await withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();

        for (const page of pages) {
          db.pages.push({
            id: randomUUID(),
            session_id: sessionId,
            url: page.url,
            title: page.title || null,
            content: page.content,
            created_at: now
          });
        }

        await writeDb(db);
      });
    },

    async getPages(sessionId) {
      const db = await readDb();
      return db.pages.filter((p) => p.session_id === sessionId);
    },

    async insertChunk(chunk: InsertChunkInput) {
      await withLock(async () => {
        const db = await readDb();

        db.chunks.push({
          id: randomUUID(),
          session_id: chunk.sessionId,
          highlight_id: chunk.highlightId,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: chunk.metadata,
          created_at: new Date().toISOString()
        });

        await writeDb(db);
      });
    },

    async matchChunks(sessionId, queryEmbedding, matchCount): Promise<RetrievedChunk[]> {
      const db = await readDb();

      return db.chunks
        .filter((chunk) => chunk.session_id === sessionId)
        .map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, matchCount);
    },

    async insertChatMessages(messages: InsertChatMessageInput[]) {
      await withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();

        for (const message of messages) {
          db.chatMessages.push({
            id: randomUUID(),
            session_id: message.sessionId,
            user_id: null,
            role: message.role,
            content: message.content,
            sources: message.sources ?? null,
            created_at: now
          });
        }

        await writeDb(db);
      });
    }
  };
}
