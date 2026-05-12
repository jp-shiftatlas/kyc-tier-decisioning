import { describe, it, expect } from 'vitest';
import { generateAuditReferenceId } from './auditReferenceId';

describe('generateAuditReferenceId', () => {
  it('formats as audit-{id}-{YYYYMMDDHHMMSS}', () => {
    const fixed = new Date(Date.UTC(2026, 4, 12, 14, 32, 47));
    expect(generateAuditReferenceId('maria', fixed)).toBe('audit-maria-20260512143247');
  });

  it('zero-pads single-digit month and day', () => {
    const fixed = new Date(Date.UTC(2026, 0, 5, 3, 4, 9));
    expect(generateAuditReferenceId('carlos', fixed)).toBe('audit-carlos-20260105030409');
  });

  it('hashes live custom-input session to short id', () => {
    const id = generateAuditReferenceId({ kind: 'live', sessionSeed: 'abc123' }, new Date(Date.UTC(2026, 4, 12, 14, 32, 47)));
    expect(id).toMatch(/^audit-[a-z0-9]{6,8}-20260512143247$/);
  });
});
