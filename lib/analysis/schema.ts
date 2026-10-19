// AI analysis output contract — SERVER ONLY (AGENTS.md §19).
// Zod schema validates model output BEFORE anything is saved.

import "server-only";

import { z } from "zod";

export const STANDARD_DISCLAIMER =
  "AI-estimated sentiment and political framing based on article text evidence — not objective truth.";

export const AnalysisOutputSchema = z
  .object({
    summary: z
      .string()
      .min(10)
      .max(2000)
      .describe("Neutral 2-4 sentence summary of the article's factual content."),
    sentimentScore: z
      .number()
      .min(-1)
      .max(1)
      .describe("Overall emotional tone from -1 (very negative) to 1 (very positive)."),
    sentimentLabel: z
      .enum(["positive", "neutral", "negative"])
      .describe("Must agree with sentimentScore: >0.2 positive, <-0.2 negative, else neutral."),
    politicalFramingLabel: z
      .enum(["left", "center", "right", "mixed", "unclear"])
      .describe(
        "AI-estimated political framing: the strongest percentage wins unless " +
          "percentages are close or evidence is weak (then mixed/unclear).",
      ),
    leftPercentage: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("Estimated share of left framing, 0-100."),
    centerPercentage: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("Estimated share of center framing, 0-100."),
    rightPercentage: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe("Estimated share of right framing, 0-100."),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in the framing assessment. Low when evidence is weak."),
    framingNotes: z
      .array(z.string().min(1))
      .min(1)
      .max(8)
      .describe("Short notes on what in the text supports the framing call."),
    loadedTerms: z
      .array(z.string().min(1))
      .max(20)
      .default([])
      .describe("Emotionally charged or slanted terms quoted from the article; empty when none."),
    disclaimer: z
      .string()
      .min(10)
      .default(STANDARD_DISCLAIMER)
      .describe(
        "One-sentence disclaimer that this is AI-estimated framing, not objective truth.",
      ),
  })
  .refine(
    (o) => o.leftPercentage + o.centerPercentage + o.rightPercentage === 100,
    {
      message: "leftPercentage + centerPercentage + rightPercentage must sum to exactly 100",
      path: ["rightPercentage"],
    },
  );

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
