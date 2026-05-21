// components/decisioning/UpstreamDataSubgroup.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { UpstreamDataSubgroup } from './UpstreamDataSubgroup';

afterEach(() => cleanup());

describe('UpstreamDataSubgroup', () => {
  it('renders the subgroup heading', () => {
    render(<UpstreamDataSubgroup title="Customer identity" fields={[]} />);
    expect(screen.getByText('Customer identity')).toBeInTheDocument();
  });

  it('renders read-only field rows when fields prop is provided', () => {
    render(
      <UpstreamDataSubgroup
        title="Customer identity"
        fields={[
          { label: 'reference', value: 'M-0042' },
          { label: 'document', value: 'PhilSys' },
        ]}
      />,
    );
    expect(screen.getByText('reference')).toBeInTheDocument();
    expect(screen.getByText('M-0042')).toBeInTheDocument();
    expect(screen.getByText('document')).toBeInTheDocument();
    expect(screen.getByText('PhilSys')).toBeInTheDocument();
  });

  it('values get tabular-nums class for column alignment', () => {
    render(
      <UpstreamDataSubgroup
        title="Volume"
        fields={[{ label: 'expected', value: 'PHP 850,000' }]}
      />,
    );
    expect(screen.getByText('PHP 850,000')).toHaveClass('tabular-nums');
  });

  it('renders editSlot children when provided (live mode)', () => {
    render(
      <UpstreamDataSubgroup title="Customer identity" editSlot={<input data-testid="form-input" />} />,
    );
    expect(screen.getByTestId('form-input')).toBeInTheDocument();
  });

  it('editSlot takes precedence over fields when both are provided', () => {
    render(
      <UpstreamDataSubgroup
        title="Customer identity"
        fields={[{ label: 'reference', value: 'M-0042' }]}
        editSlot={<input data-testid="form-input" />}
      />,
    );
    expect(screen.getByTestId('form-input')).toBeInTheDocument();
    expect(screen.queryByText('M-0042')).not.toBeInTheDocument();
  });

  it('renders nothing in the body when both fields and editSlot are absent', () => {
    const { container } = render(<UpstreamDataSubgroup title="Empty" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(container.querySelectorAll('dt').length).toBe(0);
  });
});
