import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

afterEach(() => {
  // Ensure body overflow is restored between tests (Modal cleanup should
  // already handle this, but if a test renders Modal open without unmounting,
  // the body lock would leak).
  cleanup();
  document.body.style.overflow = '';
});

const noop = () => undefined;

describe('Modal — open/close render', () => {
  it('renders Override-Modal content when open (header + textarea prompt + buttons)', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="Override recommendation" />);
    expect(screen.getByText('Override recommendation')).toBeInTheDocument();
    expect(
      screen.getByText('Document the basis for overriding the AI recommendation.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit override/i })).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    render(<Modal open={false} onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Modal — §5.5 line 359 three dismissal paths', () => {
  it('Escape key triggers onClose', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn} onSubmit={noop} title="x" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('backdrop click triggers onClose', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn} onSubmit={noop} title="x" />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('Cancel button click triggers onClose', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn} onSubmit={noop} title="x" />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clicking the dialog box does NOT close (event propagation guard)', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn} onSubmit={noop} title="x" />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Modal — §5.5 line 357 submit-disabled-until-non-whitespace validation', () => {
  it('submit disabled when textarea is empty', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByRole('button', { name: /submit override/i })).toBeDisabled();
  });

  it('submit disabled when textarea is whitespace-only', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   \n\t  ' } });
    expect(screen.getByRole('button', { name: /submit override/i })).toBeDisabled();
  });

  it('submit enabled with non-whitespace content', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'basis text' } });
    expect(screen.getByRole('button', { name: /submit override/i })).not.toBeDisabled();
  });

  it('onSubmit called with trimmed content', () => {
    const fn = vi.fn();
    render(<Modal open onClose={noop} onSubmit={fn} title="x" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  documented basis  ' } });
    fireEvent.click(screen.getByRole('button', { name: /submit override/i }));
    expect(fn).toHaveBeenCalledWith('documented basis');
  });

  it('onSubmit not called if submit is disabled (defense-in-depth)', () => {
    const fn = vi.fn();
    render(<Modal open onClose={noop} onSubmit={fn} title="x" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /submit override/i }));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Modal — ARIA (mandatory)', () => {
  it('renders role="dialog"', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders aria-modal="true"', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('aria-labelledby points to header element containing the title', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="Override recommendation" />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent('Override recommendation');
  });
});

describe('Modal — WAI-ARIA APG focus trap (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)', () => {
  it('focuses textarea on open (first focusable element)', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(document.activeElement?.tagName).toBe('TEXTAREA');
  });

  it('Tab from last focusable wraps to first', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'basis' } }); // enable submit
    const submit = screen.getByRole('button', { name: /submit override/i });
    submit.focus();
    fireEvent.keyDown(submit, { key: 'Tab' });
    expect(document.activeElement).toBe(textarea);
  });

  it('Shift+Tab from first focusable wraps to last', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'basis' } });
    textarea.focus();
    fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /submit override/i }));
  });
});

describe('Modal — body scroll lock (DERIVED under spec silence — Batch 11 prerequisite)', () => {
  it('locks body scroll when open', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll on unmount', () => {
    const { unmount } = render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores body scroll when open flips to false', () => {
    const { rerender } = render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Modal open={false} onClose={noop} onSubmit={noop} title="x" />);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('Modal — "the one allowed semi-transparent overlay" discipline boundary (§5.5 line 355)', () => {
  it('renders backdrop with .modal-backdrop utility (defined in globals.css per Batch 5)', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByTestId('modal-backdrop')).toHaveClass('modal-backdrop');
  });
});

describe('Modal — spec-silence regression guards (Card/Chip/Button/Tooltip pattern extended)', () => {
  it('dialog box has no border-radius', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByRole('dialog').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('dialog box has no shadow — backdrop is the elevation cue, not shadow', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.getByRole('dialog').className).not.toMatch(/\bshadow(-|\b)/);
  });

  it('dialog box has no transition or animation on open/close', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    const className = screen.getByRole('dialog').className;
    expect(className).not.toMatch(/\banimate-/);
    expect(className).not.toMatch(/\btransition(-|\b)/);
  });
});

// === Banner slot extension (Task 8.5 / Finding 15 disposition A) ===
//
// Modal's prop surface evolved at Task 8.5 to accept an optional `banner`
// ReactNode. Renders between the title (h2) and the textarea label.
// Decision 36h race-coordination canonical consumer: AnalystControlPanel
// injects <Pass3RaceBanner /> when raceTrigger AND overrideModalOpen.

describe('Modal — banner slot extension (Decision 36h inside-Modal placement; Task 8.5)', () => {
  it('renders no banner element when banner prop is omitted (backwards compatibility)', () => {
    render(<Modal open onClose={noop} onSubmit={noop} title="x" />);
    expect(screen.queryByTestId('modal-banner')).not.toBeInTheDocument();
  });

  it('renders the caller-supplied banner inside the dialog when banner prop is provided', () => {
    render(
      <Modal
        open
        onClose={noop}
        onSubmit={noop}
        title="x"
        banner={<div data-testid="injected-banner">RACE BANNER CONTENT</div>}
      />,
    );
    expect(screen.getByTestId('modal-banner')).toBeInTheDocument();
    expect(screen.getByTestId('injected-banner')).toBeInTheDocument();
    expect(screen.getByText('RACE BANNER CONTENT')).toBeInTheDocument();
  });

  it('renders banner BETWEEN the title (h2) and the textarea-prompt label', () => {
    render(
      <Modal
        open
        onClose={noop}
        onSubmit={noop}
        title="Override recommendation"
        banner={<div data-testid="injected-banner">banner body</div>}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const children = Array.from(dialog.children);
    const titleIdx = children.findIndex((c) => c.tagName === 'H2');
    const bannerIdx = children.findIndex((c) => c.getAttribute('data-testid') === 'modal-banner');
    const labelIdx = children.findIndex((c) => c.tagName === 'LABEL');
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(bannerIdx).toBeGreaterThan(titleIdx);
    expect(labelIdx).toBeGreaterThan(bannerIdx);
  });

  it('banner slot does not alter focus-trap behavior: textarea remains first focusable on open (APG dialog pattern preserved)', () => {
    render(
      <Modal
        open
        onClose={noop}
        onSubmit={noop}
        title="x"
        banner={<button type="button">banner button</button>}
      />,
    );
    expect(document.activeElement?.tagName).toBe('TEXTAREA');
  });
});
