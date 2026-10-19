// Supabase row types — mirror of supabase/schema.sql v1 (AGENTS.md §7).
// snake_case DB shapes. UI shapes live in lib/types.ts; the join→UI mapper
// lives in lib/supabase/queries/articles.ts. When the schema changes, update
// this file AND supabase/schema.sql AND run the ALTER SQL in the Dashboard.

// NOTE: row shapes are `type` aliases (not `interface`) on purpose:
// supabase-js v2.117+ constrains schemas to GenericSchema
// (Row: Record<string, unknown>), which interfaces fail because they lack
// implicit index signatures. Using `type` keeps full query inference.

export type SourceRow = {
  id: string;
  name: string;
  listing_url: string;
  parser_strategy: string | null;
  rss_feed_url: string | null;
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
}

export type ArticleRow = {
  id: string;
  source_id: string | null;
  original_url: string;
  canonical_url: string | null;
  title: string;
  image_url: string | null;
  published_at: string | null;
  raw_text: string;
  scraped_at: string;
  analyzed_at: string | null;
  created_at: string;
}

export type ArticleAnalysisRow = {
  id: string;
  article_id: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  bias_label: "left" | "center" | "right" | "mixed" | "unclear";
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  bias_score: number;
  confidence: number;
  framing_notes: string[];
  loaded_terms: string[];
  disclaimer: string;
  model: string;
  created_at: string;
  // NOTE: `embedding vector(1536)` is added in AGENTS §20 after pgvector is
  // enabled. Do not add it here until then.
}

export type SourceFeedRow = {
  id: string;
  source_id: string | null;
  label: string;
  feed_url: string;
  is_proxy: boolean;
  is_active: boolean;
  created_at: string;
};

export type LogRow = {
  id: number;
  level: string;
  source: string;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type OxylabsScheduleRow = {
  id: string;
  source_id: string | null;
  oxylabs_schedule_id: string | null;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export type OxylabsScheduleRunRow = {
  id: string;
  schedule_id: string | null;
  oxylabs_run_id: string | null;
  status: string | null;
  stats: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// Typed Database for supabase-js generics (typed reads + future writes).
export type Database = {
  public: {
    Tables: {
      sources: {
        Row: SourceRow;
        Insert: Omit<SourceRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SourceRow, "id">>;
        Relationships: [];
      };
      articles: {
        Row: ArticleRow;
        Insert: Omit<ArticleRow, "id" | "scraped_at" | "created_at"> & {
          id?: string;
          scraped_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ArticleRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      article_analyses: {
        Row: ArticleAnalysisRow;
        Insert: Omit<ArticleAnalysisRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ArticleAnalysisRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "article_analyses_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: true;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      logs: {
        Row: LogRow;
        Insert: Omit<LogRow, "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Omit<LogRow, "id">>;
        Relationships: [];
      };
      source_feeds: {
        Row: SourceFeedRow;
        Insert: Omit<SourceFeedRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<SourceFeedRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "source_feeds_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      oxylabs_schedules: {
        Row: OxylabsScheduleRow;
        Insert: Omit<OxylabsScheduleRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OxylabsScheduleRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedules_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      oxylabs_schedule_runs: {
        Row: OxylabsScheduleRunRow;
        Insert: Omit<OxylabsScheduleRunRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OxylabsScheduleRunRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedule_runs_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "oxylabs_schedules";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
