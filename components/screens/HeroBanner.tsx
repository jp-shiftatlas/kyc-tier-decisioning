'use client';
// components/screens/HeroBanner.tsx — Batch 12 product polish.
//
// Screen 1 hero element. Communicates the demo's value proposition at a
// glance + previews the 5-stage architecture. The horizontal flow strip
// here is intentionally a marketing-orientation surface, distinct from
// Screen 2's vertical DataFlowMap (which is the organizing axis of
// the data-flow trace). Both reinforce the same architecture story.
//
// Visual treatment: warm-cream hero card with soft shadow, large
// semibold headline (text-2xl), subhead in text-secondary, then the
// 5-box horizontal flow preview underneath with chevron separators.
// Reasoning Layer middle box accented in slate.

import { Card } from '@/components/primitives/Card';

const HERO_HEADLINE = 'Three-pass KYC tier decisioning';
const HERO_SUBHEAD =
  'An audit you can trust, with correction available when needed. Watch the pipeline generate a tier recommendation, audit it against the BSP-aligned ruleset, and self-correct when the audit catches a material flaw.';

const PIPELINE_STAGES = [
  { label: 'Onboarding', active: false },
  { label: 'AML Screening', active: false },
  { label: 'Reasoning Layer', active: true },
  { label: 'Case Management', active: false },
  { label: 'Core Banking', active: false },
];

export function HeroBanner() {
  return (
    <Card variant="hero">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-text-primary">
            {HERO_HEADLINE}
          </h2>
          <p className="font-sans text-base leading-relaxed text-text-secondary">
            {HERO_SUBHEAD}
          </p>
        </div>

        {/* 5-stage horizontal flow preview — marketing orientation visual.
            Each stage is a small chip; Reasoning Layer (this demo) is
            slate-accented; others are surface-recessed. Chevron separators
            in text-tertiary. Non-interactive (no hover, no click), per
            Decision 42 preserved static-positioning discipline. */}
        <div
          data-testid="hero-pipeline-preview"
          className="flex flex-row flex-wrap items-center gap-2 pt-2"
        >
          {PIPELINE_STAGES.map((stage, idx) => {
            const isLast = idx === PIPELINE_STAGES.length - 1;
            return (
              <div key={stage.label} className="flex items-center gap-2">
                <span
                  className={
                    stage.active
                      ? 'inline-flex items-center bg-accent-primary px-3 py-1.5 font-sans text-sm font-semibold text-text-inverse'
                      : 'inline-flex items-center border border-border-default bg-surface-elevated px-3 py-1.5 font-sans text-sm text-text-secondary'
                  }
                >
                  {stage.label}
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="font-sans text-base text-text-tertiary"
                  >
                    ›
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
