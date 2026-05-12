import { describe, it, expect } from 'vitest';
import { formatPhp, formatElapsed, formatIsoNow } from './format';
import { cx } from './classnames';

describe('formatPhp', () => {
  it('formats with PHP prefix and thousands separators', () => {
    expect(formatPhp(850000)).toBe('PHP 850,000');
  });

  it('handles zero', () => {
    expect(formatPhp(0)).toBe('PHP 0');
  });
});

describe('formatElapsed', () => {
  it('formats sub-second to tenths', () => {
    expect(formatElapsed(2300)).toBe('2.3s elapsed');
  });

  it('formats fractional seconds with one decimal', () => {
    expect(formatElapsed(4250)).toBe('4.3s elapsed');
  });
});

describe('formatIsoNow', () => {
  it('returns an ISO 8601 second-precision string', () => {
    const s = formatIsoNow(new Date('2026-05-12T14:32:47Z'));
    expect(s).toBe('2026-05-12T14:32:47Z');
  });
});

describe('cx', () => {
  it('joins truthy strings with single spaces', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values (false, null, undefined, empty string)', () => {
    expect(cx('a', false, 'b', null, 'c', undefined, '')).toBe('a b c');
  });

  it('returns empty string when all inputs are falsy', () => {
    expect(cx(false, null, undefined, '')).toBe('');
  });
});
