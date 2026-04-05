import { describe, it, expect } from 'vitest';
import { triageIssues, classifyTag } from '../src/tribunal.js';
import type { IssueGroup, Config } from '../src/types.js';

const defaultConfig: Config = {
  reviewers: {
    codex: { weight: 1.0, maxFiles: 20, enabled: true },
    gemini: { weight: 0.5, maxFiles: 50, enabled: true },
    claude: { weight: 1.0, maxFiles: 50, enabled: true },
  },
  thresholds: { confidenceMin: 70, consensusWeight: 1.5, maxIssuesPerReviewer: 15 },
  debate: { maxContestedItems: 10, timeoutSeconds: 300 },
  output: { directory: 'reviews', showConfidenceScores: true, showSeverityDisagreements: true },
  categories: ['bug', 'security', 'architecture', 'performance', 'testing', 'style'],
};

const makeGroup = (overrides: Partial<IssueGroup>): IssueGroup => ({
  canonical: {
    id: 1, severity: 'IMPORTANT', file: 'a.ts', line: 1, title: 'Test',
    category: 'bug', confidence: 80, reasoning: '', suggestion: '', reviewer: 'codex',
  },
  duplicates: [], reporters: ['codex'], weight: 1.0, tag: 'CONTESTED',
  severityDisagreement: false, ...overrides,
});

describe('classifyTag', () => {
  it('2.5 = UNANIMOUS', () => expect(classifyTag(2.5)).toBe('UNANIMOUS'));
  it('2.0 = STRONG', () => expect(classifyTag(2.0)).toBe('STRONG'));
  it('1.5 = SUFFICIENT', () => expect(classifyTag(1.5)).toBe('SUFFICIENT'));
  it('1.0 = CONTESTED', () => expect(classifyTag(1.0)).toBe('CONTESTED'));
  it('0.5 = CONTESTED', () => expect(classifyTag(0.5)).toBe('CONTESTED'));
});

describe('triageIssues', () => {
  it('routes weight >= 1.5 to consensus', () => {
    const groups = [makeGroup({ weight: 2.0, reporters: ['codex', 'claude'] })];
    const result = triageIssues(groups, defaultConfig);
    expect(result.consensus).toHaveLength(1);
    expect(result.contested).toHaveLength(0);
  });

  it('routes weight < 1.5 to contested', () => {
    const groups = [makeGroup({ weight: 1.0, reporters: ['codex'] })];
    const result = triageIssues(groups, defaultConfig);
    expect(result.contested).toHaveLength(1);
  });

  it('dismisses when all confidence below threshold', () => {
    const groups = [makeGroup({
      weight: 1.0,
      canonical: { id: 1, severity: 'MINOR', file: 'a.ts', line: 1, title: 'T',
        category: 'bug', confidence: 50, reasoning: '', suggestion: '', reviewer: 'codex' },
    })];
    const result = triageIssues(groups, defaultConfig);
    expect(result.dismissed).toHaveLength(1);
  });

  it('bypasses confidence filter for weight >= 2.0', () => {
    const groups = [makeGroup({
      weight: 2.0, reporters: ['codex', 'claude'],
      canonical: { id: 1, severity: 'MINOR', file: 'a.ts', line: 1, title: 'T',
        category: 'bug', confidence: 40, reasoning: '', suggestion: '', reviewer: 'codex' },
    })];
    const result = triageIssues(groups, defaultConfig);
    expect(result.consensus).toHaveLength(1);
    expect(result.dismissed).toHaveLength(0);
  });

  it('caps contested at maxContestedItems', () => {
    const groups = Array.from({ length: 15 }, (_, i) =>
      makeGroup({ weight: 1.0, canonical: { ...makeGroup({}).canonical, id: i } })
    );
    const result = triageIssues(groups, defaultConfig);
    expect(result.contested.length).toBeLessThanOrEqual(10);
  });
});
