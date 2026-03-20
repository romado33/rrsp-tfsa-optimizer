/**
 * schemas.js — Zod schemas for validating Claude's JSON responses.
 *
 * Claude is instructed to return specific JSON structures, but LLMs can
 * produce unexpected shapes. These schemas validate the response and
 * provide clear error messages when Claude deviates from the expected format.
 */

import { z } from 'zod';

const ScenarioNarration = z.object({
  narration: z.string().default(''),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

export const NarrationResponseSchema = z.object({
  narrations: z.record(z.string(), ScenarioNarration),
});

const Risk = z.object({
  name: z.string(),
  description: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  impact: z.string(),
});

export const DecisionGateSchema = z.object({
  recommendedScenarioId: z.string(),
  recommendedScenarioName: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  confidenceReason: z.string(),
  aiAnalyzed: z.array(z.string()).default([]),
  humanMustDecide: z.array(z.string()).default([]),
  bottomLine: z.string(),
  risks: z.array(Risk).default([]),
});
