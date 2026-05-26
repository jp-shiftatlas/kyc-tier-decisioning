import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PersonaSelector } from './PersonaSelector';

afterEach(() => {
  cleanup();
});

// Canonical (id, name, descriptor) tuples from data/personas.json. Hardcoded
// here per Finding C disposition: any future drift in personas.json content
// surfaces at test time rather than silently changing the rendered output.
// Order matches listPersonas() iteration order, which matches personas.json
// array order.
const EXPECTED_PERSONAS = [
  {
    id: 'maria',
    name: 'Maria',
    descriptor: 'Salaried PH resident — Standard-tier baseline',
  },
  {
    id: 'carlos',
    name: 'Carlos',
    descriptor: 'OFW returnee, PEP close associate — multi-factor EDD',
  },
  {
    id: 'persona_c',
    name: 'Convergent Hybrid',
    descriptor: 'Self-employed, high-risk jurisdiction — convergent EDD',
  },
  {
    id: 'persona_d',
    name: 'Documentation-Process',
    descriptor: 'Self-employed investor — documentation compounding (Standard)',
  },
] as const;

const CANONICAL_MICROCOPY = 'Pre-generated example output';

describe('PersonaSelector — Decision 22 (amended by Decision 27): four equal-weight persona cards', () => {
  it('renders all four personas from listPersonas() — regression-guards Persona D presence (Decision 27 amendment of Decision 22)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    for (const expected of EXPECTED_PERSONAS) {
      expect(
        screen.getByRole('button', { name: `Select ${expected.name}` }),
      ).toBeInTheDocument();
    }
  });

  it('renders the four cards in personas.json order (Maria, Carlos, Convergent Hybrid, Documentation-Process)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(4);
    for (let i = 0; i < EXPECTED_PERSONAS.length; i++) {
      expect(cards[i]).toHaveAttribute(
        'aria-label',
        `Select ${EXPECTED_PERSONAS[i].name}`,
      );
    }
  });

  it('no per-persona visual hierarchy — Persona D card uses the same surface treatment as Maria (Decision 27)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const mariaBtn = screen.getByRole('button', { name: 'Select Maria' });
    const personaDBtn = screen.getByRole('button', {
      name: 'Select Documentation-Process',
    });
    // Both wrappers carry the same focus-visible / cursor classes; neither
    // carries any per-persona deprioritization treatment.
    expect(mariaBtn.className).toBe(personaDBtn.className);
  });
});

describe('PersonaSelector — three-line card content (Finding C disposition)', () => {
  it('each card renders name (primary), descriptor (secondary), and canonical microcopy (tertiary)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    for (const expected of EXPECTED_PERSONAS) {
      expect(screen.getByText(expected.name)).toBeInTheDocument();
      expect(screen.getByText(expected.descriptor)).toBeInTheDocument();
    }
    // Microcopy appears once per card (4 total).
    const microcopyMatches = screen.getAllByText(CANONICAL_MICROCOPY);
    expect(microcopyMatches).toHaveLength(EXPECTED_PERSONAS.length);
  });

  it('microcopy is the canonical "Pre-generated example output" verbatim (regression-guards Finding A — 01_PROJECT_BRIEF.md:131)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const microcopyMatches = screen.getAllByText(CANONICAL_MICROCOPY);
    expect(microcopyMatches.length).toBeGreaterThan(0);
    // Negative-guard against the worktree-PRIMARY_PROMPT.md drift "Pre-generated example".
    expect(screen.queryByText('Pre-generated example')).not.toBeInTheDocument();
  });

  it('microcopy renders in --text-tertiary per Decision 33 footer-microcopy precedent', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const microcopyEl = screen.getAllByText(CANONICAL_MICROCOPY)[0];
    expect(microcopyEl).toHaveClass('text-text-tertiary');
  });

  it('name renders in --text-primary (primary visual weight)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const nameEl = screen.getByText('Maria');
    expect(nameEl).toHaveClass('text-text-primary');
  });

  it('descriptor renders in --text-secondary (secondary visual weight)', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    const descEl = screen.getByText('Salaried PH resident — Standard-tier baseline');
    expect(descEl).toHaveClass('text-text-secondary');
  });
});

describe('PersonaSelector — selection semantics (Finding F: click-active-deselect)', () => {
  it('clicking a card when nothing is active emits the clicked personaId', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId={null} onPersonaChange={onPersonaChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    expect(onPersonaChange).toHaveBeenCalledTimes(1);
    expect(onPersonaChange).toHaveBeenCalledWith('maria');
  });

  it('clicking the active card emits null (deselect) per Finding F', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId="maria" onPersonaChange={onPersonaChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    expect(onPersonaChange).toHaveBeenCalledTimes(1);
    expect(onPersonaChange).toHaveBeenCalledWith(null);
  });

  it('clicking a different card when one is active emits the clicked id (destination state, not transition)', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId="carlos" onPersonaChange={onPersonaChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    expect(onPersonaChange).toHaveBeenCalledTimes(1);
    expect(onPersonaChange).toHaveBeenCalledWith('maria');
  });
});

describe('PersonaSelector — initial state', () => {
  it('renders no active state when activePersonaId is null', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    for (const expected of EXPECTED_PERSONAS) {
      const btn = screen.getByRole('button', { name: `Select ${expected.name}` });
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    }
  });
});

describe('PersonaSelector — active state visual (Finding B accessibility + Card composition)', () => {
  it('active card has aria-pressed="true"; others have aria-pressed="false"', () => {
    render(
      <PersonaSelector activePersonaId="carlos" onPersonaChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Select Carlos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Select Maria' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      screen.getByRole('button', { name: 'Select Convergent Hybrid' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Select Documentation-Process' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('active card surface gets ring-2 ring-accent-primary; inactive cards get hover-shadow lift (Batch 12 polish)', () => {
    const { container } = render(
      <PersonaSelector activePersonaId="maria" onPersonaChange={() => {}} />,
    );
    // The Card surface is the immediate child <div> of each role="button" wrapper.
    const mariaBtn = screen.getByRole('button', { name: 'Select Maria' });
    const mariaCard = mariaBtn.firstElementChild as HTMLElement;
    expect(mariaCard).toHaveClass('ring-2');
    expect(mariaCard).toHaveClass('ring-accent-primary');

    const carlosBtn = screen.getByRole('button', { name: 'Select Carlos' });
    const carlosCard = carlosBtn.firstElementChild as HTMLElement;
    expect(carlosCard).not.toHaveClass('ring-2');
    // Batch 12: inactive cards use the Card primitive's `interactive` prop
    // for hover-shadow lift instead of a background-shift hover.
    expect(carlosCard.className).toMatch(/hover:shadow/);
    expect(container).toBeTruthy();
  });
});

describe('PersonaSelector — keyboard activation (Finding B accessibility regression-guard)', () => {
  it('Space key on a focused card fires the selection callback', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId={null} onPersonaChange={onPersonaChange} />,
    );
    const mariaBtn = screen.getByRole('button', { name: 'Select Maria' });
    fireEvent.keyDown(mariaBtn, { key: ' ' });
    expect(onPersonaChange).toHaveBeenCalledWith('maria');
  });

  it('Enter key on a focused card fires the selection callback', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId={null} onPersonaChange={onPersonaChange} />,
    );
    const carlosBtn = screen.getByRole('button', { name: 'Select Carlos' });
    fireEvent.keyDown(carlosBtn, { key: 'Enter' });
    expect(onPersonaChange).toHaveBeenCalledWith('carlos');
  });

  it('non-activation keys (Tab, Escape, letter keys) do not fire selection', () => {
    const onPersonaChange = vi.fn();
    render(
      <PersonaSelector activePersonaId={null} onPersonaChange={onPersonaChange} />,
    );
    const mariaBtn = screen.getByRole('button', { name: 'Select Maria' });
    fireEvent.keyDown(mariaBtn, { key: 'Tab' });
    fireEvent.keyDown(mariaBtn, { key: 'Escape' });
    fireEvent.keyDown(mariaBtn, { key: 'a' });
    expect(onPersonaChange).not.toHaveBeenCalled();
  });

  it('each card is tabbable (tabIndex={0})', () => {
    render(<PersonaSelector activePersonaId={null} onPersonaChange={() => {}} />);
    for (const expected of EXPECTED_PERSONAS) {
      const btn = screen.getByRole('button', { name: `Select ${expected.name}` });
      expect(btn).toHaveAttribute('tabindex', '0');
    }
  });
});

describe('PersonaSelector — structural guards: no state-machine knowledge, listPersonas-only data path', () => {
  // Sibling to lib/orchestration/personaPlayback.test.ts:145 no-API-imports
  // pattern. A future maintainer who adds a useDecisioningMachine import, a
  // raw personas.json import, or an orchestration-layer module reference to
  // PersonaSelector.tsx fails these guards before the import can produce a
  // runtime dependency.
  const src = readFileSync('components/decisioning/PersonaSelector.tsx', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports zero orchestration-layer modules (no state-machine, no playback hook, no live-decisioning hook)', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/orchestration\b/);
    }
  });

  it('does not import the raw personas.json (listPersonas is the only entry point)', () => {
    expect(fromPaths).not.toContain('@/data/personas.json');
    for (const p of fromPaths) {
      expect(p).not.toMatch(/data\/personas/);
    }
  });

  it('does not import the Button primitive (Finding B: corpus is consistent on "card" framing)', () => {
    // Button-primitive consumption would be the Option-1 path that Finding B
    // rejected. Card-with-composition-layer-button-semantics is the chosen
    // structural pattern.
    for (const p of fromPaths) {
      expect(p).not.toMatch(/primitives\/Button\b/);
    }
  });
});
