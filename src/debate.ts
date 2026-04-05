import { jaccardSimilarity } from './dedup.js';
import { fillTemplate, loadTemplate } from './template.js';
import { parseIssues } from './parser.js';
import type {
  IssueGroup, Config, DebateResult, ReviewerOutput, ReviewerPrompts, Reviewer,
} from './types.js';

const CONCESSION_THRESHOLD = 0.7;

export function detectConcession(original: string, rebuttal: string): boolean {
  if (/\bCONCEDE\b/i.test(rebuttal)) return true;
  return jaccardSimilarity(original, rebuttal) > CONCESSION_THRESHOLD;
}

export async function runDebate(
  contested: IssueGroup[],
  config: Config,
  launcherFn: (config: Config, prompts: ReviewerPrompts) => Promise<ReviewerOutput[]>,
  templateDir: string,
): Promise<DebateResult> {
  if (contested.length === 0) {
    return { resolved: [], unresolved: [], refuted: [] };
  }

  // Build contested items text for debate prompt
  const contestedText = contested
    .map((g, _i) => {
      const positions = g.reporters
        .map(r => `  Position (${r}, weight ${config.reviewers[r as Reviewer].weight}): ${g.canonical.reasoning}`)
        .join('\n');
      return `ISSUE-${g.canonical.id}: ${g.canonical.title}\n  Category: ${g.canonical.category}\n  File: ${g.canonical.file}:${g.canonical.line}\n${positions}`;
    })
    .join('\n\n');

  const weightText = Object.entries(config.reviewers)
    .filter(([, c]) => c.enabled)
    .map(([name, c]) => `- ${name}: ${c.weight}`)
    .join('\n');

  // Round 1: Challenge
  const debateTemplate = await loadTemplate(`${templateDir}/debate.md`);
  const debatePrompt = fillTemplate(debateTemplate, {
    contested_items: contestedText,
    reviewer_weights: weightText,
  });

  const prompts: ReviewerPrompts = {};
  for (const reviewer of ['codex', 'gemini', 'claude'] as Reviewer[]) {
    if (config.reviewers[reviewer]?.enabled) {
      prompts[reviewer] = debatePrompt;
    }
  }

  const challengeOutputs = await launcherFn(config, prompts);

  // Round 2: Rebuttal (simplified — send challenges back)
  const rebuttalTemplate = await loadTemplate(`${templateDir}/rebuttal.md`);
  const challengeText = challengeOutputs
    .map(o => `--- ${o.reviewer} ---\n${o.output}`)
    .join('\n\n');

  const rebuttalPrompt = fillTemplate(rebuttalTemplate, {
    challenges: challengeText,
    reviewer_weights: weightText,
  });

  const rebuttalPrompts: ReviewerPrompts = {};
  for (const reviewer of ['codex', 'gemini', 'claude'] as Reviewer[]) {
    if (config.reviewers[reviewer]?.enabled) {
      rebuttalPrompts[reviewer] = rebuttalPrompt;
    }
  }

  const rebuttalOutputs = await launcherFn(config, rebuttalPrompts);

  // Judge: recalculate weights based on concessions
  const resolved: IssueGroup[] = [];
  const unresolved: IssueGroup[] = [];

  for (const group of contested) {
    let adjustedWeight = group.weight;

    for (const output of rebuttalOutputs) {
      if (group.reporters.includes(output.reviewer)) {
        if (detectConcession(group.canonical.reasoning, output.output)) {
          adjustedWeight -= config.reviewers[output.reviewer].weight;
        }
      }
    }

    if (adjustedWeight >= config.thresholds.consensusWeight) {
      group.weight = adjustedWeight;
      resolved.push(group);
    } else {
      group.weight = adjustedWeight;
      unresolved.push(group);
    }
  }

  return { resolved, unresolved, refuted: [] };
}
