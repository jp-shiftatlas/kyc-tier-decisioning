// components/screens/DataFlowScreen.tsx
// Screen 2 — Trace the data flow.
//
// Decision 48 — wizard restructure.
// Decision 48a — DataFlowMap as organizing axis.
// Decision 48c — Run Analysis CTA inside Reasoning Layer row.
// Decision 48d — field-to-upstream mapping.
//
// Persona mode: load persona → group profile → render DataFlowMap with
//   subgroup clusters. Initial extraction animation runs for ~1.4s before
//   Run Analysis is enabled (communicates "data being pulled from upstream
//   systems"). Per Decision 46a, persona playback resolves instantly when
//   personaId is set on Screen 1 — so by the time the user reaches Screen 2
//   and the extraction animation completes, the audit machine is already at
//   passed_first_audit terminal state.
//
// Live mode: same row layout. The four data subgroups are rendered as
//   edit-slot inputs via LiveProfileFormSlots, wrapped in a single
//   FormProvider. Run Analysis triggers form validation; on success it
//   stores the profile in context, fires startLiveRun, and advances the
//   wizard to Screen 3.

'use client';

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DataFlowMap, type LiveSlotKey } from '@/components/decisioning/DataFlowMap';
import {
  CustomerIdentitySlot,
  AccountBehaviorSlot,
  RiskIndicatorsSlot,
  RelationshipSlot,
} from '@/components/decisioning/LiveProfileFormSlots';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import { groupProfileForDataFlow } from '@/lib/orchestration/fieldGrouping';
import { CustomerProfileSchema, type CustomerProfile } from '@/lib/schemas/customerProfile';
import { useWizard } from '@/components/wizard/WizardContext';
import { useDecisioning } from '@/components/orchestration/DecisioningContext';

// Extraction animation: 4 cells × 400ms stagger + 800ms per-cell duration
// = ~2400ms total. 200ms buffer past the last cell completing.
const EXTRACTION_DURATION_MS = 2600;

export function DataFlowScreen() {
  const wizard = useWizard();
  const decisioning = useDecisioning();
  const [extracting, setExtracting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setExtracting(false), EXTRACTION_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  if (wizard.mode === 'persona' && decisioning.personaId) {
    const persona = loadPersona(decisioning.personaId);
    const subgroups = groupProfileForDataFlow(persona.profile);
    return (
      <DataFlowMap
        subgroups={subgroups}
        canRun
        extracting={extracting}
        onRunAnalysis={() => {
          decisioning.startPersonaPlayback(decisioning.personaId!);
          wizard.advance();
        }}
      />
    );
  }

  // Live mode — row-layout form via LiveProfileFormSlots.
  return <DataFlowLiveMode extracting={extracting} />;
}

function DataFlowLiveMode({ extracting }: { extracting: boolean }) {
  const wizard = useWizard();
  const decisioning = useDecisioning();

  const methods = useForm<CustomerProfile>({
    resolver: zodResolver(CustomerProfileSchema),
    mode: 'onBlur',
  });

  const onValid = methods.handleSubmit((profile) => {
    decisioning.setLiveProfile(profile);
    decisioning.startLiveRun(profile);
    wizard.advance();
  });

  const liveModeSlots: Record<LiveSlotKey, React.ReactNode> = {
    'customer-identity': <CustomerIdentitySlot />,
    'account-behavior': <AccountBehaviorSlot />,
    'risk-indicators': <RiskIndicatorsSlot />,
    'relationship': <RelationshipSlot />,
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onValid}>
        <DataFlowMap
          liveModeSlots={liveModeSlots}
          canRun={!extracting}
          extracting={extracting}
          onRunAnalysis={onValid}
        />
      </form>
    </FormProvider>
  );
}
