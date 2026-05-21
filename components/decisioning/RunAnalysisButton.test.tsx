// components/decisioning/RunAnalysisButton.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RunAnalysisButton } from './RunAnalysisButton';

afterEach(() => cleanup());

describe('RunAnalysisButton', () => {
  it('renders "Run Analysis ›" label by default', () => {
    render(<RunAnalysisButton onRun={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('calls onRun when clicked and enabled', () => {
    const onRun = vi.fn();
    render(<RunAnalysisButton onRun={onRun} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onRun when disabled', () => {
    const onRun = vi.fn();
    render(<RunAnalysisButton onRun={onRun} disabled />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('shows "Starting…" label when running', () => {
    render(<RunAnalysisButton onRun={() => {}} disabled={false} running />);
    expect(screen.getByText(/starting/i)).toBeInTheDocument();
    expect(screen.queryByText(/run analysis/i)).not.toBeInTheDocument();
  });

  it('disables the button while running', () => {
    render(<RunAnalysisButton onRun={() => {}} disabled={false} running />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
