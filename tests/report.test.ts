import { describe, it, expect } from 'vitest';
import { generateReport, summaryLine } from '../src/report.js';
import type { TribunalReport, ReviewStats, Config } from '../src/types.js';

const defaultConfig: Config = {
  reviewers: {
    codex: { weight: 1.0, maxFiles: 20, enabled: true },
    gemini: { weight: 0.5, maxFiles: 50, enabled: true },
    claude: { weight: 1.0, maxFiles: 50, enabled: true },
  },
  thresholds: { confidenceMin: 70, consensusWeight: 1.5, maxIssuesPerReviewer: 15 },
  debate: { maxContestedItems: 10, timeoutSeconds: 300 },
  output: { directory: 'reviews', showConfidenceScores: true, showSeverityDisagreements: true },
  categories: ['bug'],
};

describe('summaryLine', () => {
  it('produces one-line summary', () => {
    const stats: ReviewStats = {
      total: 10, byReviewer: { codex: 4, gemini: 3, claude: 3 },
      unanimous: 1, strong: 2, sufficient: 3, unresolved: 2,
      dismissedLowConfidence: 1, dismissedRefuted: 1, debateOutcome: 'debate + rebuttal',
    };
    const line = summaryLine(stats);
    expect(line).toContain('consensus');
    expect(line).toContain('unresolved');
  });
});

describe('generateReport', () => {
  it('contains Consensus section', () => {
    const report: TribunalReport = {
      target: 'test diff',
      reviewers: [{ name: 'codex', weight: 1.0 }],
      consensus: [],
      unresolved: [],
      dismissedLowConfidence: [],
      dismissedRefuted: [],
      stats: {
        total: 0, byReviewer: {}, unanimous: 0, strong: 0, sufficient: 0,
        unresolved: 0, dismissedLowConfidence: 0, dismissedRefuted: 0, debateOutcome: 'skipped',
      },
    };
    const md = generateReport(report, defaultConfig);
    expect(md).toContain('## Consensus');
    expect(md).toContain('## Stats');
  });
});
