// components/wizard/useWizardState.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardState } from './useWizardState';

describe('useWizardState', () => {
  it('initializes at persona-select with mode=idle', () => {
    const { result } = renderHook(() => useWizardState());
    expect(result.current.activeScreen).toBe('persona-select');
    expect(result.current.mode).toBe('idle');
  });

  it('advance() moves to the next screen', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    expect(result.current.activeScreen).toBe('data-flow');
  });

  it('back() returns to the previous screen', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    act(() => result.current.back());
    expect(result.current.activeScreen).toBe('persona-select');
  });

  it('setMode tracks persona vs live vs idle', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.setMode('persona'));
    expect(result.current.mode).toBe('persona');
    act(() => result.current.setMode('live'));
    expect(result.current.mode).toBe('live');
  });

  it('reset returns to persona-select and idle mode', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.setMode('persona'));
    act(() => result.current.reset());
    expect(result.current.activeScreen).toBe('persona-select');
    expect(result.current.mode).toBe('idle');
  });

  it('advance() at last screen is a no-op', () => {
    const { result } = renderHook(() => useWizardState());
    for (let i = 0; i < 10; i++) act(() => result.current.advance());
    expect(result.current.activeScreen).toBe('analyst-action');
  });

  it('back() at first screen is a no-op', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.back());
    expect(result.current.activeScreen).toBe('persona-select');
  });

  it('initialScreen option bootstraps state at a specific screen', () => {
    const { result } = renderHook(() => useWizardState({ initialScreen: 'audit' }));
    expect(result.current.activeScreen).toBe('audit');
  });

  it('initialMode option bootstraps mode', () => {
    const { result } = renderHook(() => useWizardState({ initialMode: 'live' }));
    expect(result.current.mode).toBe('live');
  });

  it('jumpTo moves directly to a target screen', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.jumpTo('examiner-notes'));
    expect(result.current.activeScreen).toBe('examiner-notes');
  });
});
