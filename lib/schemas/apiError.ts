// lib/schemas/apiError.ts
// Typed error contract per PRIMARY_PROMPT.md §4.7.
import { z } from 'zod';

export const DecisioningErrorTypeSchema = z.enum([
  'malformed_model_json',
  'validation_failed',
  'upstream_timeout',
  'rate_limited',
  'cap_reached',
]);

export const DecisioningErrorSchema = z.strictObject({
  pass: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('re-audit')]),
  errorType: DecisioningErrorTypeSchema,
  zodIssues: z.array(z.any()).optional(),
  message: z.string(),
  retryable: z.boolean(),
});

export type DecisioningError = z.infer<typeof DecisioningErrorSchema>;
export type DecisioningErrorType = z.infer<typeof DecisioningErrorTypeSchema>;

// Institutional-register messages for the gating error types (PRIMARY_PROMPT.md §4.8)
export const ERROR_MESSAGES = {
  rate_limited_hourly: 'Live generation limit reached for this hour. Pre-generated examples remain available.',
  rate_limited_daily: 'Live generation limit reached for today. Pre-generated examples remain available.',
  cap_reached: 'Daily live-generation cap reached. Pre-generated examples remain available; live generation resumes at 00:00 UTC.',
} as const;
