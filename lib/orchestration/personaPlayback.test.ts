import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { usePersonaPlayback } from './personaPlayback';
import * as personaAdapters from '@/lib/schemas/personaAdapters';
import { loadPersona, type PersonaId } from '@/lib/schemas/personaAdapters';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ALL_PERSONAS: PersonaId[] = ['maria', 'carlos', 'persona_c', 'persona_d'];
const PASS3_FAMILY_STATES = [
  'pass_3',
  're_audit',
  'corrected_and_verified',
  'correction_failed_surfaced',
] as const;

describe('usePersonaPlayback — per-persona happy path (idle → pass_1 → pass_2 → passed_first_audit)', () => {
  for (const id of ALL_PERSONAS) {
    it(`drives ${id} through the clean playback path to passed_first_audit`, () => {
      const { result } = renderHook(() => usePersonaPlayback(id));
      // The synchronous trigger cascade settles within renderHook's act().
      expect(result.current.state.state).toBe('passed_first_audit');
      // The terminal payload exposes both Pass 1 and Pass 2 from the persona file.
      expect(result.current.state.pass1Output).not.toBeNull();
      expect(result.current.state.pass2Output).not.toBeNull();
    });
  }
});

describe('usePersonaPlayback — Decision 27 anti-pattern (no persona reaches a Pass-3-family state)', () => {
  // Decision 27: all four personas lock PASS clean — no Pass 3 / re-audit /
  // cap-reached. A future maintainer who engineers a failure case onto a
  // persona fails this test loudly (the persona would drive the machine into
  // pass_3 / re_audit / corrected_and_verified / correction_failed_surfaced).
  for (const id of ALL_PERSONAS) {
    it(`${id} never reaches a Pass-3-family state`, () => {
      const { result } = renderHook(() => usePersonaPlayback(id));
      expect(PASS3_FAMILY_STATES).not.toContain(result.current.state.state);
      // Structurally: the Pass-3 payloads stay null, attemptCount stays 0.
      expect(result.current.state.pass3Output).toBeNull();
      expect(result.current.state.reAuditOutput).toBeNull();
      expect(result.current.state.attemptCount).toBe(0);
    });
  }
});

describe('usePersonaPlayback — Decision 33 anti-pattern (no API calls fire)', () => {
  // Decision 33: persona playback is exempt from L1/L3 cost protection BECAUSE
  // no API calls fire. A future maintainer who refactors persona playback to
  // call /api/decisioning fails this test loudly.
  it('never calls fetch during a persona playback run', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderHook(() => usePersonaPlayback('maria'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('usePersonaPlayback — Decision 41a symmetry (data flows through the standard resolve path)', () => {
  // The orchestration feeds the state machine the SAME way live mode (9.4)
  // will — via the trigger callbacks → resolvePass1 / resolvePass2. The proof:
  // the terminal payloads deep-equal the persona file's pass_1 / pass_2,
  // meaning the data flowed through the standard resolution functions, not via
  // some persona-mode-specific bypass.
  it('Maria: terminal pass1Output / pass2Output deep-equal the persona file', () => {
    const maria = loadPersona('maria');
    const { result } = renderHook(() => usePersonaPlayback('maria'));
    expect(result.current.state.pass1Output).toEqual(maria.pass_1);
    expect(result.current.state.pass2Output).toEqual(maria.pass_2);
  });
});

describe('usePersonaPlayback — personas.json schema-validation (consumption-end guard for Findings 9/10/19/20)', () => {
  // All four personas load + validate cleanly through the post-2babca2
  // schemas. loadPersona throws on a Zod failure; reaching a returned value
  // means clean validation. (Per Decision 27, no persona exercises Pass 3
  // output, so this is scoped to the Pass 1 + Pass 2 schemas.)
  for (const id of ALL_PERSONAS) {
    it(`${id} loads and validates cleanly through loadPersona`, () => {
      expect(() => loadPersona(id)).not.toThrow();
      const p = loadPersona(id);
      expect(p.pass_1).toBeDefined();
      expect(p.pass_2).toBeDefined();
    });
  }
});

describe('usePersonaPlayback — loadPersona failure (spec-silence-as-discipline: surface via fail())', () => {
  it('routes to the failed terminal state with a typed DecisioningError when loadPersona throws', () => {
    // An unknown persona id makes the REAL loadPersona throw "Unknown persona
    // id" — no mocking needed. The hook catches it, surfaces it as a typed
    // DecisioningError via the state machine's fail() transition.
    const { result } = renderHook(() => usePersonaPlayback('nonexistent' as PersonaId));
    expect(result.current.state.state).toBe('failed');
    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.errorType).toBe('validation_failed');
    expect(result.current.state.error?.pass).toBe(1);
  });
});

describe('usePersonaPlayback — loadPersona is the only persona-data entry point', () => {
  it('calls loadPersona with the selected persona id', () => {
    const spy = vi.spyOn(personaAdapters, 'loadPersona');
    renderHook(() => usePersonaPlayback('carlos'));
    expect(spy).toHaveBeenCalledWith('carlos');
  });
});

describe('usePersonaPlayback — mid-flight persona switch (spec-silence-because-happy-path-assumed)', () => {
  // Switching persona mid-playback re-runs the effect: reset() returns the
  // machine to idle (dropping the prior persona's state + any stale in-flight
  // trigger via 9.1's pendingTrigger:null-on-reset), then startPass1() begins
  // the new persona.
  it('switching from Maria to Carlos produces a clean reset + Carlos terminal state', () => {
    const maria = loadPersona('maria');
    const carlos = loadPersona('carlos');
    const { result, rerender } = renderHook(
      ({ id }: { id: PersonaId }) => usePersonaPlayback(id),
      { initialProps: { id: 'maria' as PersonaId } },
    );
    // Maria settled.
    expect(result.current.state.state).toBe('passed_first_audit');
    expect(result.current.state.pass1Output).toEqual(maria.pass_1);

    // Switch to Carlos.
    rerender({ id: 'carlos' });
    expect(result.current.state.state).toBe('passed_first_audit');
    // The terminal payload is Carlos's, not Maria's — clean switch.
    expect(result.current.state.pass1Output).toEqual(carlos.pass_1);
    expect(result.current.state.pass2Output).toEqual(carlos.pass_2);
  });
});

describe('usePersonaPlayback — no persona selected', () => {
  it('returns the machine at idle when personaId is null', () => {
    const { result } = renderHook(() => usePersonaPlayback(null));
    expect(result.current.state.state).toBe('idle');
  });
});

describe('usePersonaPlayback — structural guards: no API modules, loadPersona-only data path', () => {
  // The static-analysis siblings of the runtime fetch-spy test. A future
  // maintainer who adds an API-client import, a raw personas.json import, or
  // a fetch dependency to personaPlayback.ts fails these guards before the
  // import can produce a runtime call. Same belt-and-braces discipline as the
  // schema-canon regression guards — architectural choices made structural at
  // multiple layers.
  const src = readFileSync('lib/orchestration/personaPlayback.ts', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('does not import the raw personas.json (loadPersona is the only entry point)', () => {
    expect(fromPaths).not.toContain('@/data/personas.json');
    for (const p of fromPaths) {
      expect(p).not.toMatch(/data\/personas/);
    }
  });

  it('imports zero API-call modules (Decision 33 — persona playback is cost-protection-exempt)', () => {
    // apiError (the typed-error SCHEMA) is explicitly allowed — it is not an
    // API client. Forbidden: fetch wrappers, an api/ client module.
    for (const p of fromPaths) {
      expect(p).not.toMatch(/\bfetch\b/);
      expect(p).not.toMatch(/lib\/api\b|apiClient/);
    }
  });
});
