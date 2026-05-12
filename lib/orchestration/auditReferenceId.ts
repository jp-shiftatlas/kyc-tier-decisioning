// lib/orchestration/auditReferenceId.ts
// PRIMARY_PROMPT.md §6.5: audit-{persona_id}-{YYYYMMDDHHMMSS}, readable format not epoch.

const pad = (n: number, width = 2) => n.toString().padStart(width, '0');

function formatStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const da = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${y}${mo}${da}${h}${mi}${s}`;
}

// 32-bit FNV-1a — deterministic, no crypto import needed
function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).slice(0, 8);
}

export type AuditRefSource =
  | string // persona id
  | { kind: 'live'; sessionSeed: string };

export function generateAuditReferenceId(source: AuditRefSource, now: Date = new Date()): string {
  const stamp = formatStamp(now);
  const id = typeof source === 'string' ? source : shortHash(source.sessionSeed);
  return `audit-${id}-${stamp}`;
}
