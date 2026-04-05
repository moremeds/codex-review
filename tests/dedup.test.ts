import { describe, it, expect } from 'vitest';
import { jaccardSimilarity, deduplicateIssues } from '../src/dedup.js';
import type { Issue } from '../src/types.js';

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(jaccardSimilarity('same words', 'same words')).toBe(1.0);
  });

  it('returns high score for reordered words', () => {
    expect(jaccardSimilarity('null check missing', 'missing null check')).toBe(1.0);
  });

  it('returns low score for different strings', () => {
    expect(jaccardSimilarity('race condition', 'completely different')).toBeLessThan(0.4);
  });

  it('returns 0 for empty string', () => {
    expect(jaccardSimilarity('', 'something')).toBe(0);
  });
});

const makeIssue = (overrides: Partial<Issue>): Issue => ({
  id: 1, severity: 'IMPORTANT', file: 'src/foo.ts', line: 42,
  title: 'Test issue', category: 'bug', confidence: 80,
  reasoning: 'Because reasons.', suggestion: 'Fix it.', reviewer: 'codex',
  ...overrides,
});

describe('deduplicateIssues', () => {
  const weights = { codex: 1.0, gemini: 0.5, claude: 1.0 };

  it('groups issues on same file within 5 lines with similar titles', () => {
    const issues = [
      makeIssue({ file: 'a.ts', line: 42, title: 'null check missing', reviewer: 'codex' }),
      makeIssue({ file: 'a.ts', line: 44, title: 'missing null check', reviewer: 'claude' }),
    ];
    const groups = deduplicateIssues(issues, weights);
    expect(groups).toHaveLength(1);
    expect(groups[0].reporters).toContain('codex');
    expect(groups[0].reporters).toContain('claude');
    expect(groups[0].weight).toBe(2.0);
  });

  it('does NOT group issues far apart', () => {
    const issues = [
      makeIssue({ file: 'a.ts', line: 42, title: 'null check', reviewer: 'codex' }),
      makeIssue({ file: 'a.ts', line: 100, title: 'null check', reviewer: 'claude' }),
    ];
    const groups = deduplicateIssues(issues, weights);
    expect(groups).toHaveLength(2);
  });

  it('does NOT group issues with dissimilar titles', () => {
    const issues = [
      makeIssue({ file: 'a.ts', line: 42, title: 'null check missing', reviewer: 'codex' }),
      makeIssue({ file: 'a.ts', line: 43, title: 'SQL injection vulnerability', reviewer: 'claude' }),
    ];
    const groups = deduplicateIssues(issues, weights);
    expect(groups).toHaveLength(2);
  });

  it('uses highest severity and flags disagreement', () => {
    const issues = [
      makeIssue({ severity: 'MINOR', reviewer: 'codex' }),
      makeIssue({ severity: 'CRITICAL', reviewer: 'claude' }),
    ];
    const groups = deduplicateIssues(issues, weights);
    expect(groups[0].canonical.severity).toBe('CRITICAL');
    expect(groups[0].severityDisagreement).toBe(true);
  });
});
