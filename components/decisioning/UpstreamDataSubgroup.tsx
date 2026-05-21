// components/decisioning/UpstreamDataSubgroup.tsx
// One data subgroup card inside a PipelineStageRow's right panel.
//
// Read-only mode (persona playback): fields prop carries [{label, value}]
// rows. Each value is rendered inside a boxed cell — visual signal that
// "this came from an upstream system" (or, for live mode, "this was just
// encoded by the user"). Box uses --surface-recessed + --border-default
// to read as a read-only input field.
//
// Edit mode (live custom input): editSlot prop carries an RHF form section
// rendered in place of the read-only fields. Card chrome is identical in
// both modes.

'use client';

import { Card } from '@/components/primitives/Card';

export interface SubgroupFieldRow {
  label: string;
  value: string;
}

interface UpstreamDataSubgroupProps {
  title: string;
  /** Read-only persona-mode rendering. Mutually exclusive with editSlot. */
  fields?: SubgroupFieldRow[];
  /** Live-mode edit rendering (form section). Mutually exclusive with fields. */
  editSlot?: React.ReactNode;
}

export function UpstreamDataSubgroup({ title, fields, editSlot }: UpstreamDataSubgroupProps) {
  return (
    <Card variant="elevated" className="min-w-[220px] flex-1">
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-sm font-semibold text-text-tertiary">
          {title}
        </h3>
        {editSlot ? (
          editSlot
        ) : fields && fields.length > 0 ? (
          <dl className="flex flex-col gap-3 font-sans text-sm">
            {fields.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <dt className="text-text-secondary text-xs">{row.label}</dt>
                <dd className="rounded-none border border-border-default bg-surface-recessed px-3 py-2 text-text-primary tabular-nums">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Card>
  );
}
