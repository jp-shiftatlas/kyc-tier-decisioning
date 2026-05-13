// components/primitives/ProgressBar.tsx
// ProgressBar primitive per visual_system.md §5.8 line 433.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.8 line 433 — "Simulated loading with --accent-primary thin progress
//                     bar at the top of the panel that's currently loading"
//   §5.8 line 438 — "Same visual pattern as persona playback for the loading
//                     bar and skeletons" (live generation reuses this primitive)
//   §2 tokens — --accent-primary (fill), --surface-recessed (track background)
//
// USE-CASE CONSTRAINT (spec-bound):
// This primitive renders the "thin progress bar at the top of the panel"
// during persona playback and live generation. It is NOT a generic progress
// indicator for other contexts. Distinct from ElapsedTimeIndicator (Batch 7,
// Decision 41) which is the *text* counter — both co-exist during live
// generation. ProgressBar is the visual bar; ElapsedTimeIndicator is the
// elapsed-time text.
//
// VARIANT SET: zero — only `progress` (0–100) is parametric. No size prop,
// no color variant, no orientation prop. Single-purpose.
//
// MOTION: width transition is allowed and INTENDED per §5.8 "Simulated
// loading" implicit contract — a progress bar without smooth motion between
// values is just a static bar that fails to communicate progress. This is
// distinct from chevron rotation (two-state) or hover-state transitions on
// buttons — width is continuous and motion is functional, not theater. §6
// line 464's "Nothing else animates" discipline applies to decorative
// animation; the loading bar's width transition is the §5.8 spec contract.
//
// Progress is clamped to [0, 100] to defend against caller bugs (negative
// values would emit a CSS-invalid width; >100 would overflow the track
// visually if the track had padding, though h-full mitigates it).
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal pattern):
//   - no border-radius on track or fill
//   - no shadow
//   - no animate-* utilities (transition-[width] is the only allowed motion,
//     per the spec contract above)

interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="h-0.5 w-full overflow-hidden bg-surface-recessed">
      <div
        data-testid="progress-bar-fill"
        className="h-full bg-accent-primary transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
