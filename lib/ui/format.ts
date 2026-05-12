// lib/ui/format.ts
// String formatters used by decisioning UI primitives.
//
// formatPhp     — PHP {amount with thousands separators}. Used for risk thresholds
//                 and account-purpose-volume rendering. Pair with tabular-nums
//                 utility at the consumer site (visual_system.md §3 type discipline).
// formatElapsed — "{seconds.tenths}s elapsed" for the ElapsedTimeIndicator
//                 (visual_system.md §6.2 / Decision 41 audit-panel ticking pace).
// formatIsoNow  — ISO 8601 seconds-precision timestamp (no millisecond fraction).
//                 Used for audit reference IDs and the Pass 2 generated_at field.

export function formatPhp(n: number): string {
  return `PHP ${n.toLocaleString('en-US')}`;
}

export function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s elapsed`;
}

export function formatIsoNow(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
