#!/usr/bin/env tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CliArgs, Reviewer, ReviewerPrompts, TribunalReport, ReviewStats } from './types.js';
import { loadConfig } from './config.js';
import { detectContext } from './context.js';
import { selectFiles } from './file-selector.js';
import { fillTemplate, loadTemplate } from './template.js';
import { launchReviewers } from './launcher.js';
import { parseIssues } from './parser.js';
import { deduplicateIssues } from './dedup.js';
import { triageIssues } from './tribunal.js';
import { runDebate } from './debate.js';
import { generateReport, summaryLine } from './report.js';

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  let i = 0;
  while (i < argv.length) {
    switch (argv[i]) {
      case '--diff': args.diff = true; break;
      case '--pr': args.pr = true; break;
      case '--plan': args.plan = argv[++i]; break;
      case '--files': {
        args.files = [];
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          args.files.push(argv[++i]);
        }
        break;
      }
      case '--confidence': args.confidence = parseInt(argv[++i], 10); break;
      case '--no-debate': args.noDebate = true; break;
    }
    i++;
  }
  return args;
}

export function isBootstrapTarget(files: string[]): boolean {
  return files.some(f => f.includes('skills/codex-review/'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  if (args.confidence) {
    config.thresholds.confidenceMin = args.confidence;
  }

  const context = await detectContext(args);

  // Bootstrap detection
  if (isBootstrapTarget(context.changedFiles)) {
    console.log('Bootstrap exception: self-review detected. Use single-pass mode.');
    process.exit(0);
  }

  const { slim, rich } = await selectFiles(context, config);
  const templateDir = join(cwd, 'skills/codex-review/templates');

  // Build reviewer prompts
  const reviewTemplate = await loadTemplate(join(templateDir, 'review.md'));
  const reviewerWeights = Object.entries(config.reviewers)
    .filter(([, c]) => c.enabled)
    .map(([name, c]) => `- ${name}: ${c.weight}`)
    .join('\n');

  const preambles: Record<Reviewer, string> = {
    codex: 'Your specialty focus is BUG DETECTION: edge cases, off-by-one errors, null/undefined handling, race conditions, incorrect logic, and boundary failures.',
    gemini: 'Your specialty focus is CROSS-FILE CONSISTENCY: API contract mismatches, import graph issues, architectural pattern violations, dead code, interface drift.',
    claude: 'Your specialty focus is INTEGRATION CORRECTNESS: test coverage gaps, call-site impact analysis, integration correctness.',
  };

  const prompts: ReviewerPrompts = {};
  for (const reviewer of ['codex', 'gemini', 'claude'] as Reviewer[]) {
    if (!config.reviewers[reviewer]?.enabled) continue;
    const pkg = reviewer === 'gemini' ? rich : slim;
    const fileContents = pkg.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n');
    prompts[reviewer] = fillTemplate(reviewTemplate, {
      project_context: '',
      coding_standards: '',
      review_content: context.diff + '\n\n' + fileContents,
      review_mode: context.mode,
      review_type: context.mode,
      specialization_preamble: preambles[reviewer],
      confidence_threshold: String(config.thresholds.confidenceMin),
      categories: config.categories.join('|'),
    });
  }

  // Launch reviews
  const outputs = await launchReviewers(config, prompts);

  // Parse issues
  const allIssues = outputs.flatMap(o => parseIssues(o.output, o.reviewer));

  // Dedup
  const weights: Record<Reviewer, number> = {
    codex: config.reviewers.codex.weight,
    gemini: config.reviewers.gemini.weight,
    claude: config.reviewers.claude.weight,
  };
  const groups = deduplicateIssues(allIssues, weights);

  // Triage
  const triage = triageIssues(groups, config);

  // Debate
  let debateResult = { resolved: [] as typeof triage.contested, unresolved: [] as typeof triage.contested, refuted: [] as typeof triage.contested };
  let debateOutcome = 'skipped';

  if (triage.contested.length > 0 && !args.noDebate) {
    debateResult = await runDebate(triage.contested, config, launchReviewers, templateDir);
    debateOutcome = 'debate + rebuttal';
  } else if (triage.contested.length > 0) {
    debateResult.unresolved = triage.contested;
    debateOutcome = 'skipped (--no-debate)';
  }

  // Build report
  const stats: ReviewStats = {
    total: allIssues.length,
    byReviewer: outputs.reduce((acc, o) => {
      acc[o.reviewer] = parseIssues(o.output, o.reviewer).length;
      return acc;
    }, {} as Record<string, number>),
    unanimous: [...triage.consensus, ...debateResult.resolved].filter(g => g.tag === 'UNANIMOUS').length,
    strong: [...triage.consensus, ...debateResult.resolved].filter(g => g.tag === 'STRONG').length,
    sufficient: [...triage.consensus, ...debateResult.resolved].filter(g => g.tag === 'SUFFICIENT').length,
    unresolved: debateResult.unresolved.length,
    dismissedLowConfidence: triage.dismissed.length,
    dismissedRefuted: debateResult.refuted.length,
    debateOutcome,
  };

  const report: TribunalReport = {
    target: `${context.mode} review`,
    reviewers: Object.entries(config.reviewers)
      .filter(([, c]) => c.enabled)
      .map(([name, c]) => ({ name: name as Reviewer, weight: c.weight })),
    consensus: [...triage.consensus, ...debateResult.resolved],
    unresolved: debateResult.unresolved,
    dismissedLowConfidence: triage.dismissed,
    dismissedRefuted: debateResult.refuted,
    stats,
  };

  const reportMd = generateReport(report, config);

  // Write report
  const outDir = join(cwd, config.output.directory);
  await mkdir(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = join(outDir, `review-${timestamp}.md`);
  await writeFile(outPath, reportMd);

  console.log(summaryLine(stats) + ` → ${outPath}`);
}

// Only run main when executed directly (not when imported by tests)
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
