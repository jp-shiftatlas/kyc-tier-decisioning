// components/decisioning/DataFlowMap.tsx
// Screen 2 composition: vertical 5-stage pipeline with data subgroups
// anchored to the right of each row.
//
// Decision 48 — wizard restructure organizing axis.
// Decision 48a — architecture strip evolves to vertical layout on Screen 2.
// Decision 48b — first box renamed Onboarding.
// Decision 48c — Run Analysis CTA inside Reasoning Layer row.
// Decision 48d — field-to-upstream mapping.
// Decision 42 (preserved) — box non-interactivity discipline maintained.
//
// Modes:
//   - Persona: `subgroups` prop carries read-only data clusters per row.
//     `extracting` prop drives the staggered extraction animation.
//   - Live: `liveModeSlots` prop provides one ReactNode per subgroup —
//     same row layout, but each subgroup card holds an input form section
//     instead of read-only values.
//
// Bank-source captions on Onboarding + AML Screening rows make the upstream-
// integration story explicit: viewers see immediately that the data feeding
// the reasoning layer comes from the bank's existing onboarding / AML
// platforms in production.

'use client';

import { PipelineStageRow } from './PipelineStageRow';
import { UpstreamDataSubgroup } from './UpstreamDataSubgroup';
import { RunAnalysisButton } from './RunAnalysisButton';
import type { GroupedSubgroup, UpstreamBoxId } from '@/lib/orchestration/fieldGrouping';

const ANNOTATION_V1_BODY = 'single-model with independent re-derivation.';
const ANNOTATION_PROD_BODY = 'multi-model audit on Bedrock with redacted input.';

const ONBOARDING_SOURCE_CAPTION =
  'In production, this data is pulled from the bank’s existing onboarding intake — identity verification, KYC interview, and account-opening systems.';
const AML_SOURCE_CAPTION =
  'In production, these indicators are returned by the bank’s AML screening provider (e.g., LexisNexis WorldCompliance, Refinitiv) against PEP / sanctions / adverse-media watchlists.';

export type LiveSlotKey =
  | 'customer-identity'
  | 'account-behavior'
  | 'risk-indicators'
  | 'relationship';

interface DataFlowMapProps {
  /** Persona-mode read-only rendering. Mutually exclusive with liveModeSlots. */
  subgroups?: GroupedSubgroup[];
  /** Live-mode edit slots — one ReactNode per subgroup, same row positions as persona mode. */
  liveModeSlots?: Record<LiveSlotKey, React.ReactNode>;
  onRunAnalysis: () => void;
  canRun: boolean;
  running?: boolean;
  /** When true, subgroup cards fade in with stagger animation; Run Analysis is disabled. */
  extracting?: boolean;
}

function filterSubgroupsByUpstream(subgroups: GroupedSubgroup[], upstream: UpstreamBoxId) {
  return subgroups.filter((g) => g.upstream === upstream);
}

// Render-time helper: wrap a subgroup with the extraction animation class and
// per-item stagger delay. Index drives the delay so later subgroups appear
// after earlier ones.
function AnimatedCell({
  index,
  extracting,
  children,
}: {
  index: number;
  extracting: boolean;
  children: React.ReactNode;
}) {
  if (!extracting) return <>{children}</>;
  return (
    <div
      className="animate-extract-in flex-1"
      style={{ animationDelay: `${index * 400}ms` }}
    >
      {children}
    </div>
  );
}

export function DataFlowMap({
  subgroups,
  liveModeSlots,
  onRunAnalysis,
  canRun,
  running = false,
  extracting = false,
}: DataFlowMapProps) {
  const onboardingSubgroups = subgroups ? filterSubgroupsByUpstream(subgroups, 'onboarding') : [];
  const amlSubgroups = subgroups ? filterSubgroupsByUpstream(subgroups, 'aml-screening') : [];
  const isLiveMode = !!liveModeSlots;

  // Map subgroup titles to live-slot keys so persona-mode title ordering
  // (Customer identity / Account & behavior / Relationship) is preserved
  // in live mode rendering.
  const renderOnboardingPersona = onboardingSubgroups.map((g, i) => (
    <AnimatedCell key={g.title} index={i} extracting={extracting}>
      <UpstreamDataSubgroup title={g.title} fields={g.fields} />
    </AnimatedCell>
  ));

  const renderOnboardingLive = liveModeSlots
    ? [
        <UpstreamDataSubgroup key="ci" title="Customer identity" editSlot={liveModeSlots['customer-identity']} />,
        <UpstreamDataSubgroup key="ab" title="Account & behavior" editSlot={liveModeSlots['account-behavior']} />,
        <UpstreamDataSubgroup key="rel" title="Relationship" editSlot={liveModeSlots['relationship']} />,
      ]
    : null;

  const renderAmlPersona = amlSubgroups.map((g, i) => (
    <AnimatedCell key={g.title} index={3 + i} extracting={extracting}>
      <UpstreamDataSubgroup title={g.title} fields={g.fields} />
    </AnimatedCell>
  ));

  const renderAmlLive = liveModeSlots ? (
    <UpstreamDataSubgroup title="Risk indicators" editSlot={liveModeSlots['risk-indicators']} />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Onboarding row */}
      <PipelineStageRow stageLabel="Onboarding" notLast>
        <div data-testid="stage-onboarding-panel" className="flex flex-col gap-3">
          <p className="font-sans text-xs italic text-text-tertiary">
            {ONBOARDING_SOURCE_CAPTION}
          </p>
          <div className="flex flex-row flex-wrap gap-4">
            {isLiveMode ? renderOnboardingLive : renderOnboardingPersona}
          </div>
        </div>
      </PipelineStageRow>

      {/* AML Screening row */}
      <PipelineStageRow stageLabel="AML Screening" notLast>
        <div data-testid="stage-aml-screening-panel" className="flex flex-col gap-3">
          <p className="font-sans text-xs italic text-text-tertiary">
            {AML_SOURCE_CAPTION}
          </p>
          <div className="flex flex-row flex-wrap gap-4">
            {isLiveMode ? renderAmlLive : renderAmlPersona}
          </div>
        </div>
      </PipelineStageRow>

      {/* Reasoning Layer row — Run Analysis CTA */}
      <PipelineStageRow stageLabel="Reasoning Layer" active notLast>
        <div data-testid="stage-reasoning-layer-panel" className="flex flex-col gap-3">
          <p className="font-sans text-sm text-text-secondary">
            Three-pass audit will run here.
          </p>
          <p className="font-sans text-xs text-text-tertiary">
            Pass 1 &rarr; Pass 2 &rarr; Pass 3 (conditional)
          </p>
          <RunAnalysisButton
            onRun={onRunAnalysis}
            disabled={!canRun || extracting}
            running={running}
          />
        </div>
      </PipelineStageRow>

      {/* Case Management row */}
      <PipelineStageRow stageLabel="Case Management" notLast>
        <div data-testid="stage-case-management-panel" className="flex flex-col gap-1">
          <p className="font-sans text-sm text-text-secondary">
            Analyst decision persists here in production.
          </p>
          <p className="font-sans text-xs text-text-tertiary">
            (Approve / Escalate / Override outcome record)
          </p>
        </div>
      </PipelineStageRow>

      {/* Core Banking row — terminal, no connector */}
      <PipelineStageRow stageLabel="Core Banking">
        <div data-testid="stage-core-banking-panel">
          <p className="font-sans text-sm text-text-tertiary">
            Downstream of decision scope.
          </p>
        </div>
      </PipelineStageRow>

      {/* v1/Production annotation */}
      <div className="mt-4 flex flex-col items-center gap-1 font-sans text-sm">
        <div>
          <span className="text-text-tertiary">v1 demo:</span>{' '}
          <span className="text-text-secondary">{ANNOTATION_V1_BODY}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Production:</span>{' '}
          <span className="text-text-secondary">{ANNOTATION_PROD_BODY}</span>
        </div>
      </div>
    </div>
  );
}
