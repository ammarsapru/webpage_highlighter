export type HighlightInput = {
  id?: string;
  text: string;
  pageTitle?: string;
  pageUrl?: string;
  heading?: string;
  surroundingText?: string;
  userNote?: string;
  createdAt?: string;
};

export type PageInput = {
  url: string;
  title?: string;
  content: string;
};

export type SessionInput = {
  title: string;
  highlights: HighlightInput[];
  pages?: PageInput[];
};

export type RetrievedChunk = {
  id: string;
  content: string;
  similarity?: number;
  metadata?: Record<string, unknown>;
};
