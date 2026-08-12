import { createLocalStore } from "./localStore";
import { createSupabaseStore } from "./supabaseStore";
import type { DataStore } from "./types";

export * from "./types";

function isPlaceholder(value: string) {
  return value.trim() === "" || value.startsWith("your_");
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && !isPlaceholder(url) && !isPlaceholder(key));
}

let store: DataStore | null = null;

// Until Supabase is configured (NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY set to real values), this app runs entirely on
// a local JSON file under web/.local-data/ — no external services needed to
// try it out. Swapping storage backends later (Supabase or anything else)
// only requires a new DataStore implementation here.
export function getStore(): DataStore {
  if (!store) {
    store = isSupabaseConfigured() ? createSupabaseStore() : createLocalStore();
  }
  return store;
}
