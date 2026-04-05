import type { TribunalReport, IssueGroup, Config, ReviewStats } from './types.js';

export function summaryLine(stats: ReviewStats): string {
  const consensus = stats.unanimous + stats.strong + stats.sufficient;
  return `Tribunal: ${consensus} consensus (${stats.unanimous} unanimous), ${stats.unresolved} unresolved, ${stats.dismissedLowConfidence + stats.dismissedRefuted} dismissed`;
}

export function generateReport(report: TribunalReport, config: Config): string {
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# Tribunal Review — ${report.target}`);
  lines.push('');
  lines.push(`**Date:** ${date}`);
  lines.push(`**Reviewers:** ${report.reviewers.map(r => `${r.name} (weight ${r.weight})`).join(' + ')}`);
  lines.push('');

  // Consensus
  lines.push(`## Consensus (${report.consensus.length} items)`);
  lines.push('');
  if (report.consensus.length === 0) {
    lines.push('(none)');
  } else {
    for (const severity of ['CRITICAL', 'IMPORTANT', 'MINOR'] as const) {
      const items = report.consensus.filter(g => g.canonical.severity === severity);
      if (items.length === 0) continue;
      lines.push(`### ${severity}`);
      lines.push('');
      for (const g of items) {
        lines.push(`- **[${g.canonical.severity}]** ${g.canonical.file}:${g.canonical.line} — ${g.canonical.title}`);
        lines.push(`  Category: ${g.canonical.category}`);
        lines.push(`  Agreement: ${g.tag.toLowerCase()} (${g.weight})`);
        lines.push(`  Flagged by: ${g.reporters.join(', ')}`);
        if (config.output.showConfidenceScores) {
          lines.push(`  Confidence: ${g.canonical.confidence}`);
        }
        if (config.output.showSeverityDisagreements && g.severityDisagreement) {
          lines.push(`  **Note:** Reviewers disagreed on severity`);
        }
        lines.push(`  Resolution: ${g.canonical.suggestion}`);
        lines.push('');
      }
    }
  }

  // Unresolved
  lines.push(`## Unresolved (${report.unresolved.length} items) — Needs Your Decision`);
  lines.push('');
  if (report.unresolved.length === 0) {
    lines.push('(none)');
  } else {
    for (const g of report.unresolved) {
      lines.push(`- **${g.canonical.file}:${g.canonical.line}** — ${g.canonical.title}`);
      lines.push(`  Category: ${g.canonical.category}`);
      lines.push(`  Reporters: ${g.reporters.join(', ')}`);
      lines.push(`  Reasoning: ${g.canonical.reasoning}`);
      lines.push('');
    }
  }

  // Dismissed
  lines.push('## Dismissed');
  lines.push('');
  lines.push(`### Low Confidence (${report.dismissedLowConfidence.length} items)`);
  if (report.dismissedLowConfidence.length === 0) {
    lines.push('(none)');
  } else {
    for (const g of report.dismissedLowConfidence) {
      lines.push(`- ${g.canonical.file}:${g.canonical.line} — ${g.canonical.title} (confidence: ${g.canonical.confidence})`);
    }
  }
  lines.push('');
  lines.push(`### Refuted (${report.dismissedRefuted.length} items)`);
  if (report.dismissedRefuted.length === 0) {
    lines.push('(none)');
  } else {
    for (const g of report.dismissedRefuted) {
      lines.push(`- ${g.canonical.file}:${g.canonical.line} — ${g.canonical.title}`);
    }
  }
  lines.push('');

  // Stats
  lines.push('## Stats');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total issues raised | ${report.stats.total} |`);
  for (const [rev, count] of Object.entries(report.stats.byReviewer)) {
    lines.push(`| ${rev} | ${count} |`);
  }
  lines.push(`| Unanimous | ${report.stats.unanimous} |`);
  lines.push(`| Strong consensus | ${report.stats.strong} |`);
  lines.push(`| Sufficient consensus | ${report.stats.sufficient} |`);
  lines.push(`| Unresolved | ${report.stats.unresolved} |`);
  lines.push(`| Dismissed | ${report.stats.dismissedLowConfidence + report.stats.dismissedRefuted} |`);
  lines.push(`| Debate | ${report.stats.debateOutcome} |`);
  lines.push('');

  return lines.join('\n');
}
