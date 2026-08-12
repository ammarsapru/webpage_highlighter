import type { HighlightInput, PageInput, RetrievedChunk } from "@/types";

export type SessionRecord = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  summary: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type HighlightRecord = {
  id: string;
  session_id: string;
  user_id: string;
  text: string;
  page_title: string | null;
  page_url: string | null;
  heading: string | null;
  surrounding_text: string | null;
  user_note: string | null;
  created_at: string;
};

export type PageRecord = {
  id: string;
  session_id: string;
  url: string;
  title: string | null;
  content: string;
  created_at: string;
};

export type ChatMessageRecord = {
  id: string;
  session_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  sources: unknown;
  created_at: string;
};

export type InsertChunkInput = {
  sessionId: string;
  highlightId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
};

export type InsertChatMessageInput = {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: unknown;
};

// Storage abstraction so the app can run against a local file-backed store
// with zero setup, and swap in Supabase (or another backend later) just by
// implementing this interface.
export interface DataStore {
  createSession(input: { userId: string; title: string }): Promise<SessionRecord>;
  listSessions(): Promise<SessionRecord[]>;
  getSession(id: string): Promise<SessionRecord | null>;
  updateSessionSummary(id: string, summary: string): Promise<void>;

  insertHighlights(
    sessionId: string,
    userId: string,
    highlights: HighlightInput[]
  ): Promise<void>;
  getHighlights(sessionId: string): Promise<HighlightRecord[]>;

  insertPages(sessionId: string, pages: PageInput[]): Promise<void>;
  getPages(sessionId: string): Promise<PageRecord[]>;

  insertChunk(chunk: InsertChunkInput): Promise<void>;
  matchChunks(
    sessionId: string,
    queryEmbedding: number[],
    matchCount: number
  ): Promise<RetrievedChunk[]>;

  insertChatMessages(messages: InsertChatMessageInput[]): Promise<void>;
}
