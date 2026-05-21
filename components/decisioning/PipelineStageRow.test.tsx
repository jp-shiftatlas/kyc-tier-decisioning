// components/decisioning/PipelineStageRow.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PipelineStageRow } from './PipelineStageRow';

afterEach(() => cleanup());

describe('PipelineStageRow', () => {
  it('renders the stage label in the left cell', () => {
    render(
      <PipelineStageRow stageLabel="Onboarding">
        <div data-testid="right-content">data</div>
      </PipelineStageRow>,
    );
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('right-content')).toBeInTheDocument();
  });

  it('applies accent treatment when active', () => {
    render(
      <PipelineStageRow stageLabel="Reasoning Layer" active>
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(screen.getByText('Reasoning Layer')).toHaveAttribute('data-stage-active', 'true');
  });

  it('non-active rows do not carry accent treatment', () => {
    render(
      <PipelineStageRow stageLabel="Onboarding">
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(screen.getByText('Onboarding')).toHaveAttribute('data-stage-active', 'false');
  });

  it('renders a vertical connector below the row when notLast', () => {
    const { container } = render(
      <PipelineStageRow stageLabel="Onboarding" notLast>
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(container.querySelector('[data-testid="pipeline-connector"]')).toBeInTheDocument();
  });

  it('does not render a connector when last row', () => {
    const { container } = render(
      <PipelineStageRow stageLabel="Core Banking">
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(container.querySelector('[data-testid="pipeline-connector"]')).not.toBeInTheDocument();
  });

  it('left cell is NOT interactive (no role, no tabIndex)', () => {
    render(
      <PipelineStageRow stageLabel="AML Screening">
        <div>data</div>
      </PipelineStageRow>,
    );
    const left = screen.getByText('AML Screening');
    expect(left).not.toHaveAttribute('role');
    expect(left).not.toHaveAttribute('tabindex');
  });
});
