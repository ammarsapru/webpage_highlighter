import { getSupabaseServer } from "@/lib/supabaseServer";
import type { HighlightInput, PageInput, RetrievedChunk } from "@/types";
import type {
  DataStore,
  InsertChatMessageInput,
  InsertChunkInput
} from "./types";

export function createSupabaseStore(): DataStore {
  const supabase = getSupabaseServer();

  return {
    async createSession({ userId, title }) {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: userId, title })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },

    async listSessions() {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getSession(id) {
      const { data } = await supabase.from("sessions").select("*").eq("id", id).single();
      return data || null;
    },

    async updateSessionSummary(id, summary) {
      const { error } = await supabase
        .from("sessions")
        .update({ summary, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },

    async insertHighlights(sessionId, userId, highlights: HighlightInput[]) {
      const rows = highlights.map((highlight) => ({
        session_id: sessionId,
        user_id: userId,
        text: highlight.text,
        page_title: highlight.pageTitle || null,
        page_url: highlight.pageUrl || null,
        heading: highlight.heading || null,
        surrounding_text: highlight.surroundingText || null,
        user_note: highlight.userNote || null,
        created_at: highlight.createdAt || new Date().toISOString()
      }));

      const { error } = await supabase.from("highlights").insert(rows);
      if (error) throw error;
    },

    async getHighlights(sessionId) {
      const { data, error } = await supabase
        .from("highlights")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },

    async insertPages(sessionId, pages: PageInput[]) {
      if (pages.length === 0) return;

      const rows = pages.map((page) => ({
        session_id: sessionId,
        url: page.url,
        title: page.title || null,
        content: page.content
      }));

      const { error } = await supabase.from("pages").insert(rows);
      if (error) throw error;
    },

    async getPages(sessionId) {
      const { data, error } = await supabase.from("pages").select("*").eq("session_id", sessionId);
      if (error) throw error;
      return data || [];
    },

    async insertChunk(chunk: InsertChunkInput) {
      const { error } = await supabase.from("chunks").insert({
        session_id: chunk.sessionId,
        highlight_id: chunk.highlightId,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata
      });

      if (error) throw error;
    },

    async matchChunks(sessionId, queryEmbedding, matchCount): Promise<RetrievedChunk[]> {
      const { data, error } = await supabase.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_session_id: sessionId,
        match_count: matchCount
      });

      if (error) throw error;
      return data || [];
    },

    async insertChatMessages(messages: InsertChatMessageInput[]) {
      const rows = messages.map((message) => ({
        session_id: message.sessionId,
        role: message.role,
        content: message.content,
        sources: message.sources ?? null
      }));

      const { error } = await supabase.from("chat_messages").insert(rows);
      if (error) throw error;
    }
  };
}
