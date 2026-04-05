import type { Issue, Reviewer, Severity } from './types.js';

const ISSUE_HEADER = /^ISSUE-(\d+)\s+\[(\w+)\]\s+([^:\s]+):(\d+)\s*[—\u2014-]+\s*(.+)$/;
const NO_ISSUES = /no issues found/i;

export function parseIssues(output: string, reviewer: Reviewer): Issue[] {
  if (!output.trim() || NO_ISSUES.test(output)) return [];

  const issues: Issue[] = [];
  const lines = output.split('\n');
  let current: Partial<Issue> | null = null;

  for (const line of lines) {
    const headerMatch = line.match(ISSUE_HEADER);
    if (headerMatch) {
      if (current) issues.push(finalizeIssue(current, reviewer));
      current = {
        id: parseInt(headerMatch[1], 10),
        severity: headerMatch[2] as Severity,
        file: headerMatch[3],
        line: parseInt(headerMatch[4], 10),
        title: headerMatch[5].trim(),
        reviewer,
      };
      continue;
    }

    if (current) {
      const trimmed = line.trim();
      const fieldMatch = trimmed.match(/^(Category|Confidence|Reasoning|Suggestion):\s*(.+)/);
      if (fieldMatch) {
        const [, key, value] = fieldMatch;
        switch (key) {
          case 'Category': current.category = value.trim(); break;
          case 'Confidence': current.confidence = parseInt(value.trim(), 10); break;
          case 'Reasoning': current.reasoning = value.trim(); break;
          case 'Suggestion': current.suggestion = value.trim(); break;
        }
      }
    }
  }

  if (current) issues.push(finalizeIssue(current, reviewer));
  return issues;
}

function finalizeIssue(partial: Partial<Issue>, reviewer: Reviewer): Issue {
  return {
    id: partial.id ?? 0,
    severity: partial.severity ?? 'MINOR',
    file: partial.file ?? 'unknown',
    line: partial.line ?? 0,
    title: partial.title ?? 'Unparsed issue',
    category: partial.category ?? 'unknown',
    confidence: partial.confidence ?? 0,
    reasoning: partial.reasoning ?? '',
    suggestion: partial.suggestion ?? '',
    reviewer,
    raw: partial.raw,
  };
}
