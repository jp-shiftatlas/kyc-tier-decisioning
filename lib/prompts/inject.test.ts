import { describe, it, expect } from 'vitest';
import { injectPrompt, stripDocComments } from './inject';
import { MARKERS } from './markers';

const sampleProfile = { customer_reference: 'Test', occupation_type: 'employed' };
const samplePass1 = { decision: { recommended_tier: 'Standard' } };
const samplePass2 = { overall_status: 'PASS', checks: [] };

describe('stripDocComments — Amendment 14', () => {
  it('strips a single HTML comment block', () => {
    expect(stripDocComments('hello <!-- meta --> world')).toBe('hello  world');
  });

  it('strips back-to-back comment blocks', () => {
    expect(stripDocComments('a<!--x--><!--y-->b')).toBe('ab');
  });

  it('strips multiline comments (the source-file shape)', () => {
    const input = '<!--\nPass 1 — header doc\nmultiple lines\n-->\n# Actual Body';
    expect(stripDocComments(input)).toBe('\n# Actual Body');
  });

  it('handles a comment immediately preceding a marker with no separating whitespace', () => {
    const input = '<!--meta-->[CUSTOMER PROFILE JSON INSERTED HERE]';
    expect(stripDocComments(input)).toBe('[CUSTOMER PROFILE JSON INSERTED HERE]');
  });

  it('preserves content with no comments', () => {
    const input = '# Title\n\nbody text\n';
    expect(stripDocComments(input)).toBe(input);
  });

  it('is non-greedy across multiple comments (does not swallow content between)', () => {
    expect(stripDocComments('<!--a-->keep<!--b-->')).toBe('keep');
  });
});

describe('injectPrompt — Pass 1', () => {
  it('produces a non-empty string with no markers remaining', () => {
    const out = injectPrompt({ pass: 1, profile: sampleProfile });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain(MARKERS.ruleset);
    expect(out).not.toContain(MARKERS.customer_profile);
  });

  it('inlines the customer profile JSON', () => {
    const out = injectPrompt({ pass: 1, profile: sampleProfile });
    expect(out).toContain('"customer_reference": "Test"');
  });

  it('output contains no HTML comments (doc-block stripped per Amendment 14)', () => {
    const out = injectPrompt({ pass: 1, profile: sampleProfile });
    expect(out).not.toMatch(/<!--[\s\S]*?-->/);
  });
});

describe('injectPrompt — Pass 2', () => {
  it('inlines ruleset, profile, and Pass 1 output', () => {
    const out = injectPrompt({ pass: 2, profile: sampleProfile, pass1: samplePass1 });
    expect(out).not.toContain(MARKERS.ruleset_pass2);
    expect(out).not.toContain(MARKERS.customer_profile);
    expect(out).not.toContain(MARKERS.pass1_output);
    expect(out).toContain('"recommended_tier": "Standard"');
    expect(out).toContain('"customer_reference": "Test"');
  });

  it('output contains no HTML comments', () => {
    const out = injectPrompt({ pass: 2, profile: sampleProfile, pass1: samplePass1 });
    expect(out).not.toMatch(/<!--[\s\S]*?-->/);
  });
});

describe('injectPrompt — Pass 3', () => {
  it('inlines all four content sources + orchestration context', () => {
    const out = injectPrompt({
      pass: 3,
      profile: sampleProfile,
      pass1: samplePass1,
      pass2: samplePass2,
      orchestration: { audit_id: 'audit-test-20260512143247', attempt: 1 },
    });
    expect(out).not.toContain(MARKERS.ruleset_pass3);
    expect(out).not.toContain(MARKERS.original_pass1_output);
    expect(out).not.toContain(MARKERS.pass2_output);
    expect(out).toContain('audit-test-20260512143247');
    expect(out).toContain('correction_attempt_number: 1');
  });

  it('output contains no HTML comments', () => {
    const out = injectPrompt({
      pass: 3,
      profile: sampleProfile,
      pass1: samplePass1,
      pass2: samplePass2,
      orchestration: { audit_id: 'audit-test', attempt: 1 },
    });
    expect(out).not.toMatch(/<!--[\s\S]*?-->/);
  });
});

describe('injectPrompt — error paths', () => {
  it('throws if a required source is missing', () => {
    expect(() => injectPrompt({ pass: 2, profile: sampleProfile } as any)).toThrow();
    expect(() => injectPrompt({ pass: 3, profile: sampleProfile, pass1: samplePass1 } as any)).toThrow();
  });
});
