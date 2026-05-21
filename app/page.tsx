// app/page.tsx — Batch 12.9 wizard restructure.
//
// Replaces the prior single-scroll layout (PersonaSelector → decisioning-surface
// → CustomInputForm → ArchitectureStrip sibling sections) with a 5-screen
// wizard hosted by WizardShell, wrapped in DecisioningProvider per Decision 48.
//
// === LAYOUT ===
//
// Single <main> region with WizardShell as the only child. WizardShell owns
// screen navigation; per-screen content lives in the screens map.
//
// === ARCHITECTURE STRIP ===
//
// The ArchitectureStrip page-bottom placement (Decision 42 prior framing) is
// fully replaced. Its 5-box content is folded into DataFlowMap on Screen 2
// per Decision 48a. The ArchitectureStrip component file becomes orphaned;
// flagged for cleanup decision in docs/batch-12-wizard-restructure.md.
//
// === DECISIONING PROVIDER ===
//
// DecisioningProvider replaces DecisioningOrchestrator as the state-owning
// wrapper. The provider exposes state via DecisioningContext; screens consume
// via useDecisioning(). DecisioningOrchestrator becomes orphan after this
// change.

import { WizardShell, type ScreenMap } from '@/components/wizard/WizardShell';
import { DecisioningProvider } from '@/components/orchestration/DecisioningProvider';
import { PersonaSelectScreen } from '@/components/screens/PersonaSelectScreen';
import { DataFlowScreen } from '@/components/screens/DataFlowScreen';
import { AuditScreen } from '@/components/screens/AuditScreen';
import { ExaminerNotesScreen } from '@/components/screens/ExaminerNotesScreen';
import { AnalystActionScreen } from '@/components/screens/AnalystActionScreen';

const SCREENS: ScreenMap = {
  'persona-select': PersonaSelectScreen,
  'data-flow': DataFlowScreen,
  'audit': AuditScreen,
  'examiner-notes': ExaminerNotesScreen,
  'analyst-action': AnalystActionScreen,
};

export default function HomePage() {
  return (
    <main
      data-testid="home-main"
      className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-12 xl:px-0"
    >
      <DecisioningProvider>
        <WizardShell screens={SCREENS} />
      </DecisioningProvider>
    </main>
  );
}
