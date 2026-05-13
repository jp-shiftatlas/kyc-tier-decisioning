import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExaminerNotesSection } from './ExaminerNotesSection';

describe('ExaminerNotesSection — Amendment 13 single-section render', () => {
  it('renders the small-caps label above the prose paragraph', () => {
    render(<ExaminerNotesSection label="Decision Summary" content="The applicant is recommended for Standard tier." />);
    expect(screen.getByText('Decision Summary')).toBeInTheDocument();
    expect(screen.getByText('The applicant is recommended for Standard tier.')).toBeInTheDocument();
  });

  it('uses h3 heading level (sub-section within Examiner Notes h2)', () => {
    render(<ExaminerNotesSection label="Audit Trail" content="Trail content." />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Audit Trail');
  });

  it('label uses the spec-named small-caps treatment (text-xs uppercase tracking-wide text-text-secondary)', () => {
    render(<ExaminerNotesSection label="Profile Analysis" content="x" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('text-xs');
    expect(heading).toHaveClass('uppercase');
    expect(heading).toHaveClass('tracking-wide');
    expect(heading).toHaveClass('text-text-secondary');
  });

  it('prose uses --font-serif + --text-md (17px) + --leading-loose (1.7) per §5.3', () => {
    render(<ExaminerNotesSection label="L" content="Some prose content." />);
    const prose = screen.getByText('Some prose content.');
    expect(prose).toHaveClass('font-serif');
    expect(prose).toHaveClass('text-md');
    expect(prose).toHaveClass('leading-loose');
    expect(prose).toHaveClass('text-text-primary');
  });

  it('whitespace-pre-line preserves paragraph breaks from persona JSON content', () => {
    render(<ExaminerNotesSection label="L" content={'first paragraph\n\nsecond paragraph'} />);
    const prose = screen.getByText(/first paragraph/);
    expect(prose).toHaveClass('whitespace-pre-line');
  });
});

describe('ExaminerNotesSection — trust boundary (caller filters null, section does not)', () => {
  it('renders empty string content if passed (trust-boundary discipline — does not defensively check)', () => {
    const { container } = render(<ExaminerNotesSection label="L" content="" />);
    // The <p> still renders with empty content; caller is responsible for null-filtering.
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    // p element exists in the section even with empty content
    expect(container.querySelector('p')).toBeInTheDocument();
  });
});
