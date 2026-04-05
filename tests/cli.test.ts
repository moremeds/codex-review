import { describe, it, expect } from 'vitest';
import { parseArgs, isBootstrapTarget } from '../src/cli.js';

describe('parseArgs', () => {
  it('parses --diff', () => {
    expect(parseArgs(['--diff'])).toEqual({ diff: true });
  });

  it('parses --pr', () => {
    expect(parseArgs(['--pr'])).toEqual({ pr: true });
  });

  it('parses --plan with file', () => {
    expect(parseArgs(['--plan', 'docs/plan.md'])).toEqual({ plan: 'docs/plan.md' });
  });

  it('parses --files with multiple paths', () => {
    expect(parseArgs(['--files', 'a.ts', 'b.ts'])).toEqual({ files: ['a.ts', 'b.ts'] });
  });

  it('parses --confidence', () => {
    expect(parseArgs(['--confidence', '80'])).toEqual({ confidence: 80 });
  });

  it('parses --no-debate', () => {
    expect(parseArgs(['--no-debate'])).toEqual({ noDebate: true });
  });
});

describe('isBootstrapTarget', () => {
  it('detects skill self-review', () => {
    expect(isBootstrapTarget(['skills/codex-review/SKILL.md'])).toBe(true);
  });

  it('returns false for normal files', () => {
    expect(isBootstrapTarget(['src/cli.ts'])).toBe(false);
  });
});
