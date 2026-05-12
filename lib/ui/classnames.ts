// lib/ui/classnames.ts
// Conditional className composer. Filters falsy values (false, null, undefined, '')
// so callers can write `cx('base', active && 'is-active', error && 'has-error')`
// without ternary boilerplate.

export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
