// Analysis prompt construction — SERVER ONLY (AGENTS.md §19).
// Framing must be AI-estimated from article text evidence only.

import "server-only";

export const MAX_ARTICLE_CHARS = 8000;

export const ANALYSIS_INSTRUCTIONS =
  "You are a neutral news analyst. Analyze the news article below and return " +
  "ONLY the requested structured assessment.\n" +
  "Rules:\n" +
  "- Base everything on the article TEXT. Never infer framing from the outlet name.\n" +
  "- summary: neutral, factual, 2-4 sentences. No opinions, no loaded language.\n" +
  "- sentimentScore (-1 to 1) and sentimentLabel must agree: above 0.2 is " +
  "positive, below -0.2 is negative, otherwise neutral.\n" +
  "- leftPercentage, centerPercentage, rightPercentage are integers 0-100 " +
  "that MUST sum to exactly 100.\n" +
  "- politicalFramingLabel is AI-estimated, not truth: use the strongest " +
  "percentage (left/center/right). Use mixed when two sides are both strong. " +
  "Use unclear with low confidence when the text gives little political signal.\n" +
  "- confidence (0-1): high only with clear textual evidence; low for unclear.\n" +
  "- framingNotes: cite what in the text supports the call (wording, topic " +
  "selection, sources quoted).\n" +
  "- loadedTerms: exact charged/slanted words or phrases from the article; " +
  "empty array when the wording is neutral.";

export function buildAnalysisPrompt(title: string, rawText: string): string {
  const text =
    rawText.length > MAX_ARTICLE_CHARS
      ? `${rawText.slice(0, MAX_ARTICLE_CHARS)}\n\n[truncated for length]`
      : rawText;
  return `TITLE: ${title}\n\nARTICLE TEXT:\n${text}`;
}

/** Hint appended on the single retry after a validation/model failure. */
export function buildRetryHint(errorMessage: string): string {
  return (
    `Your previous response was rejected for this reason: ${errorMessage}. ` +
    `Fix exactly that and return a fully valid assessment. Percentages must ` +
    `be integers summing to exactly 100.`
  );
}
