import type { Issue, IssueGroup, Reviewer, AgreementTag } from './types.js';

const LINE_PROXIMITY = 5;
const JACCARD_THRESHOLD = 0.4;

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 0;
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function deduplicateIssues(
  issues: Issue[],
  reviewerWeights: Record<Reviewer, number>,
): IssueGroup[] {
  const groups: IssueGroup[] = [];

  for (const issue of issues) {
    let merged = false;
    for (const group of groups) {
      if (
        group.canonical.file === issue.file &&
        Math.abs(group.canonical.line - issue.line) <= LINE_PROXIMITY &&
        jaccardSimilarity(group.canonical.title, issue.title) >= JACCARD_THRESHOLD &&
        !group.reporters.includes(issue.reviewer)
      ) {
        group.duplicates.push(issue);
        group.reporters.push(issue.reviewer);
        group.weight += reviewerWeights[issue.reviewer] ?? 0;
        if (issue.severity !== group.canonical.severity) {
          group.severityDisagreement = true;
        }
        const severityRank = { CRITICAL: 3, IMPORTANT: 2, MINOR: 1 };
        if (severityRank[issue.severity] > severityRank[group.canonical.severity]) {
          group.canonical = { ...group.canonical, severity: issue.severity };
        }
        if (issue.confidence > group.canonical.confidence) {
          group.canonical = { ...group.canonical, confidence: issue.confidence };
        }
        if (issue.reasoning.length > group.canonical.reasoning.length) {
          group.canonical = { ...group.canonical, reasoning: issue.reasoning };
        }
        merged = true;
        break;
      }
    }
    if (!merged) {
      groups.push({
        canonical: { ...issue },
        duplicates: [],
        reporters: [issue.reviewer],
        weight: reviewerWeights[issue.reviewer] ?? 0,
        tag: 'CONTESTED',
        severityDisagreement: false,
      });
    }
  }

  return groups;
}
