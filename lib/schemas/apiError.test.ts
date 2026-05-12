import { describe, it, expect } from 'vitest';
import { DecisioningErrorSchema } from './apiError';

describe('DecisioningErrorSchema', () => {
  it('validates a malformed_model_json error', () => {
    const e = { pass: 1, errorType: 'malformed_model_json', message: 'Model returned non-JSON output.', retryable: true };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('validates a rate_limited error', () => {
    const e = { pass: 1, errorType: 'rate_limited', message: 'Hourly limit reached. Try again in 47 minutes.', retryable: false };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('validates re-audit pass label', () => {
    const e = { pass: 're-audit', errorType: 'validation_failed', message: 'Re-audit output failed schema validation.', retryable: true, zodIssues: [] };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('rejects unknown errorType', () => {
    const e = { pass: 1, errorType: 'oops', message: 'x', retryable: false };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(false);
  });
});
