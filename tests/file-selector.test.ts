import { describe, it, expect } from 'vitest';
import { rankFilesByDiffSize, findTestFile } from '../src/file-selector.js';

describe('rankFilesByDiffSize', () => {
  it('sorts files by insertions + deletions descending', () => {
    const numstat = '50\t10\tsrc/big.ts\n5\t2\tsrc/small.ts\n20\t20\tsrc/medium.ts';
    const ranked = rankFilesByDiffSize(numstat);
    expect(ranked[0].path).toBe('src/big.ts');
    expect(ranked[1].path).toBe('src/medium.ts');
    expect(ranked[2].path).toBe('src/small.ts');
  });
});

describe('findTestFile', () => {
  it('generates test file candidates', () => {
    const candidates = findTestFile('src/parser.ts');
    expect(candidates).toContain('src/parser.test.ts');
    expect(candidates).toContain('src/parser.spec.ts');
    expect(candidates).toContain('tests/parser.test.ts');
  });
});
