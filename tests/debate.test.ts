import { describe, it, expect } from 'vitest';
import { detectConcession } from '../src/debate.js';

describe('detectConcession', () => {
  it('detects restated argument as concession', () => {
    const original = 'The function lacks null checking on the return value';
    const rebuttal = 'The function lacks null checking on its return value';
    expect(detectConcession(original, rebuttal)).toBe(true);
  });

  it('accepts genuinely new evidence as defense', () => {
    const original = 'The function lacks null checking';
    const rebuttal = 'Looking at the call site in main.ts:55, the upstream filter guarantees non-null';
    expect(detectConcession(original, rebuttal)).toBe(false);
  });

  it('detects explicit CONCEDE keyword', () => {
    expect(detectConcession('original argument', 'CONCEDE: the challenge convinced me')).toBe(true);
  });
});
