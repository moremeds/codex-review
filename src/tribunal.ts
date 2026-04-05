import type { IssueGroup, Config, TriageResult, AgreementTag } from './types.js';

export function classifyTag(weight: number): AgreementTag {
  if (weight >= 2.5) return 'UNANIMOUS';
  if (weight >= 2.0) return 'STRONG';
  if (weight >= 1.5) return 'SUFFICIENT';
  return 'CONTESTED';
}

export function triageIssues(groups: IssueGroup[], config: Config): TriageResult {
  const consensus: IssueGroup[] = [];
  const contested: IssueGroup[] = [];
  const dismissed: IssueGroup[] = [];

  for (const group of groups) {
    group.tag = classifyTag(group.weight);

    // Confidence filter: dismiss if ALL below threshold AND weight < 2.0
    const maxConfidence = Math.max(
      group.canonical.confidence,
      ...group.duplicates.map(d => d.confidence),
    );
    if (maxConfidence < config.thresholds.confidenceMin && group.weight < 2.0) {
      dismissed.push(group);
      continue;
    }

    // Weight routing
    if (group.weight >= config.thresholds.consensusWeight) {
      consensus.push(group);
    } else {
      contested.push(group);
    }
  }

  // Cap contested items
  if (contested.length > config.debate.maxContestedItems) {
    const overflow = contested.splice(config.debate.maxContestedItems);
    consensus.push(...overflow);
  }

  return { consensus, contested, dismissed };
}
