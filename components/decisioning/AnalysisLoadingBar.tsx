'use client';
// components/decisioning/AnalysisLoadingBar.tsx
// Indeterminate loading indicator used during Pass 1 simulation phase on
// Screen 3. A slate-accent stripe sweeps left-to-right across a recessed
// track on continuous loop — clearly visible motion that communicates
// "work is being done."
//
// Distinct from the §5.8 thin ProgressBar primitive (used for determinate
// per-panel progress per visual_system.md §5.8). This indicator is for the
// Pass 1 sim phase only, where visibility needs to override the thin-bar
// discipline.
//
// CSS keyframe `loading-sweep` lives in app/globals.css.

export function AnalysisLoadingBar() {
  return (
    <div
      data-testid="analysis-loading-bar"
      className="relative h-2 w-full overflow-hidden bg-surface-recessed"
    >
      <div className="absolute inset-y-0 w-1/3 animate-loading-sweep bg-accent-primary" />
    </div>
  );
}
