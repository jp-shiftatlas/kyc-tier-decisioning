// components/wizard/StepIndicator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders all 5 step labels', () => {
    render(<StepIndicator activeScreen="data-flow" />);
    expect(screen.getByText('Choose')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Memo')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('marks the active step with aria-current="step"', () => {
    render(<StepIndicator activeScreen="audit" />);
    const active = screen.getByText('Audit');
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('renders chevron separators between steps', () => {
    const { container } = render(<StepIndicator activeScreen="persona-select" />);
    const chevrons = container.querySelectorAll('[data-testid="step-chevron"]');
    expect(chevrons.length).toBe(4); // 5 steps, 4 chevrons
  });

  it('applies completed treatment to steps before the active one', () => {
    render(<StepIndicator activeScreen="audit" />);
    expect(screen.getByText('Choose')).toHaveAttribute('data-step-status', 'completed');
    expect(screen.getByText('Flow')).toHaveAttribute('data-step-status', 'completed');
  });

  it('applies upcoming treatment to steps after the active one', () => {
    render(<StepIndicator activeScreen="audit" />);
    expect(screen.getByText('Memo')).toHaveAttribute('data-step-status', 'upcoming');
    expect(screen.getByText('Action')).toHaveAttribute('data-step-status', 'upcoming');
  });
});
