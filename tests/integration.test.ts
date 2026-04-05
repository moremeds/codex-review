import { describe, it, expect } from 'vitest';
import { parseIssues } from '../src/parser.js';
import { deduplicateIssues } from '../src/dedup.js';
import { triageIssues } from '../src/tribunal.js';
import { generateReport, summaryLine } from '../src/report.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import type { Reviewer, TribunalReport, ReviewStats } from '../src/types.js';

describe('end-to-end pipeline', () => {
  it('processes reviewer outputs through full pipeline', () => {
    const codexOutput = `ISSUE-1 [CRITICAL] src/a.ts:10 — Null pointer dereference in handler\n  Category: bug\n  Confidence: 90\n  Reasoning: No null check.\n  Suggestion: Add check.`;
    const claudeOutput = `ISSUE-1 [CRITICAL] src/a.ts:11 — Null pointer dereference in handler\n  Category: bug\n  Confidence: 85\n  Reasoning: Caller assumes non-null.\n  Suggestion: Guard clause.`;
    const geminiOutput = `ISSUE-1 [MINOR] src/b.ts:50 — Unused import\n  Category: style\n  Confidence: 60\n  Reasoning: Not referenced.\n  Suggestion: Remove.`;

    const codexIssues = parseIssues(codexOutput, 'codex');
    const claudeIssues = parseIssues(claudeOutput, 'claude');
    const geminiIssues = parseIssues(geminiOutput, 'gemini');

    expect(codexIssues).toHaveLength(1);
    expect(claudeIssues).toHaveLength(1);
    expect(geminiIssues).toHaveLength(1);

    const allIssues = [...codexIssues, ...claudeIssues, ...geminiIssues];
    const weights: Record<Reviewer, number> = { codex: 1.0, gemini: 0.5, claude: 1.0 };
    const groups = deduplicateIssues(allIssues, weights);

    // Codex + Claude should merge (same file, close lines, similar title)
    expect(groups.length).toBeLessThanOrEqual(2);
    const mergedGroup = groups.find(g => g.canonical.file === 'src/a.ts');
    expect(mergedGroup).toBeDefined();
    expect(mergedGroup!.weight).toBe(2.0);
    expect(mergedGroup!.reporters).toContain('codex');
    expect(mergedGroup!.reporters).toContain('claude');

    // Triage
    const triage = triageIssues(groups, DEFAULT_CONFIG);
    expect(triage.consensus.length).toBeGreaterThanOrEqual(1);

    // Gemini's lone low-confidence issue should be dismissed
    const geminiGroup = groups.find(g => g.canonical.file === 'src/b.ts');
    if (geminiGroup) {
      expect(triage.dismissed).toContain(geminiGroup);
    }

    // Report generation
    const stats: ReviewStats = {
      total: 3, byReviewer: { codex: 1, gemini: 1, claude: 1 },
      unanimous: 0, strong: 1, sufficient: 0, unresolved: 0,
      dismissedLowConfidence: 1, dismissedRefuted: 0, debateOutcome: 'skipped',
    };
    const report: TribunalReport = {
      target: 'test', reviewers: [{ name: 'codex', weight: 1.0 }],
      consensus: triage.consensus, unresolved: [],
      dismissedLowConfidence: triage.dismissed, dismissedRefuted: [],
      stats,
    };
    const md = generateReport(report, DEFAULT_CONFIG);
    expect(md).toContain('CRITICAL');
    expect(md).toContain('src/a.ts');

    const line = summaryLine(stats);
    expect(line).toContain('1 consensus');
  });
});
