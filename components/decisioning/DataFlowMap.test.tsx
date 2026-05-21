// components/decisioning/DataFlowMap.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataFlowMap, type LiveSlotKey } from './DataFlowMap';
import type { GroupedSubgroup } from '@/lib/orchestration/fieldGrouping';

afterEach(() => cleanup());

const PROFILE_SUBGROUPS: GroupedSubgroup[] = [
  { title: 'Customer identity', upstream: 'onboarding', fields: [{ label: 'Customer reference', value: 'M-0042' }] },
  { title: 'Account & behavior', upstream: 'onboarding', fields: [{ label: 'Occupation', value: 'Employed' }] },
  { title: 'Risk indicators', upstream: 'aml-screening', fields: [{ label: 'PEP status', value: 'None' }] },
  { title: 'Relationship', upstream: 'onboarding', fields: [{ label: 'Years with bank', value: '6' }] },
];

describe('DataFlowMap', () => {
  it('renders all five stage labels in canonical order', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    ['Onboarding', 'AML Screening', 'Reasoning Layer', 'Case Management', 'Core Banking'].forEach((l) =>
      expect(screen.getByText(l)).toBeInTheDocument(),
    );
  });

  it('applies active treatment to Reasoning Layer row only', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    expect(screen.getByText('Reasoning Layer')).toHaveAttribute('data-stage-active', 'true');
    expect(screen.getByText('Onboarding')).toHaveAttribute('data-stage-active', 'false');
    expect(screen.getByText('AML Screening')).toHaveAttribute('data-stage-active', 'false');
  });

  it('places Customer identity + Account & behavior + Relationship inside Onboarding row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const panel = screen.getByTestId('stage-onboarding-panel');
    expect(panel).toContainElement(screen.getByText('Customer identity'));
    expect(panel).toContainElement(screen.getByText('Account & behavior'));
    expect(panel).toContainElement(screen.getByText('Relationship'));
  });

  it('places Risk indicators inside AML Screening row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const panel = screen.getByTestId('stage-aml-screening-panel');
    expect(panel).toContainElement(screen.getByText('Risk indicators'));
  });

  it('renders bank-source caption on Onboarding row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const panel = screen.getByTestId('stage-onboarding-panel');
    expect(panel.textContent).toMatch(/bank.+existing onboarding/i);
  });

  it('renders bank-source caption on AML Screening row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const panel = screen.getByTestId('stage-aml-screening-panel');
    expect(panel.textContent).toMatch(/AML screening provider/i);
  });

  it('renders Run Analysis button inside the Reasoning Layer row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const reasoningPanel = screen.getByTestId('stage-reasoning-layer-panel');
    expect(reasoningPanel).toContainElement(screen.getByRole('button', { name: /run analysis/i }));
  });

  it('renders v1/Production annotation below the row stack', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    expect(screen.getByText('v1 demo:')).toBeInTheDocument();
    expect(screen.getByText('Production:')).toBeInTheDocument();
  });

  it('Run Analysis button is disabled when canRun is false', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun={false} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeDisabled();
  });

  it('Run Analysis button is disabled while extracting', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun extracting />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeDisabled();
  });

  it('clicking Run Analysis fires onRunAnalysis', () => {
    const onRun = vi.fn();
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={onRun} canRun />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  describe('live mode (liveModeSlots)', () => {
    const slots: Record<LiveSlotKey, React.ReactNode> = {
      'customer-identity': <input data-testid="live-input-ci" />,
      'account-behavior': <input data-testid="live-input-ab" />,
      'risk-indicators': <input data-testid="live-input-ri" />,
      'relationship': <input data-testid="live-input-rel" />,
    };

    it('renders the 4 slot inputs in the correct subgroup positions', () => {
      render(<DataFlowMap liveModeSlots={slots} onRunAnalysis={() => {}} canRun />);
      const onboardingPanel = screen.getByTestId('stage-onboarding-panel');
      expect(onboardingPanel).toContainElement(screen.getByTestId('live-input-ci'));
      expect(onboardingPanel).toContainElement(screen.getByTestId('live-input-ab'));
      expect(onboardingPanel).toContainElement(screen.getByTestId('live-input-rel'));

      const amlPanel = screen.getByTestId('stage-aml-screening-panel');
      expect(amlPanel).toContainElement(screen.getByTestId('live-input-ri'));
    });

    it('preserves the Customer identity / Account & behavior / Relationship subgroup titles in live mode', () => {
      render(<DataFlowMap liveModeSlots={slots} onRunAnalysis={() => {}} canRun />);
      expect(screen.getByText('Customer identity')).toBeInTheDocument();
      expect(screen.getByText('Account & behavior')).toBeInTheDocument();
      expect(screen.getByText('Relationship')).toBeInTheDocument();
      expect(screen.getByText('Risk indicators')).toBeInTheDocument();
    });

    it('preserves the Run Analysis button in live mode (now the form submit trigger)', () => {
      render(<DataFlowMap liveModeSlots={slots} onRunAnalysis={() => {}} canRun />);
      expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
    });
  });
});
