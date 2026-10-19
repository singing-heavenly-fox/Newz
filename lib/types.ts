export type SentimentLabel = "positive" | "neutral" | "negative";
export type BiasLabel = "left" | "center" | "right" | "mixed" | "unclear";

export interface Source {
  id: string;
  name: string;
  listing_url: string;
  logo_url?: string | null;
}

export interface ArticleAnalysis {
  article_id: string;
  summary: string;
  sentiment_score: number; // -1 to 1
  sentiment_label: SentimentLabel;
  bias_label: BiasLabel; // AI-estimated
  left_percentage: number; // 0-100
  center_percentage: number; // 0-100
  right_percentage: number; // 0-100
  bias_score: number; // (right - left) / 100
  confidence: number; // 0-1
  framing_notes: string[];
  loaded_terms: string[];
  disclaimer: string;
  model: string;
  embedding: number[] | null; // pgvector 1536 later; null hides Related
}

export interface Article {
  id: string;
  source: Source;
  original_url: string;
  canonical_url: string;
  title: string;
  excerpt: string;
  image_url: string;
  published_at: string; // ISO
  raw_text: string;
  read_minutes: number;
  analysis: ArticleAnalysis | null;
}

export type ArticleWithAnalysis = Article & { analysis: ArticleAnalysis };
