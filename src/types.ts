export type Severity = 'CRITICAL' | 'IMPORTANT' | 'MINOR';
export type ReviewMode = 'diff' | 'pr' | 'plan' | 'files' | 'branch-diff';
export type Reviewer = 'codex' | 'gemini' | 'claude';
export type Verdict = 'VALID' | 'INVALID' | 'PARTIALLY_VALID';
export type AgreementTag = 'UNANIMOUS' | 'STRONG' | 'SUFFICIENT' | 'CONTESTED' | 'CONFLICTING';

export interface Issue {
  id: number;
  severity: Severity;
  file: string;
  line: number;
  title: string;
  category: string;
  confidence: number;
  reasoning: string;
  suggestion: string;
  reviewer: Reviewer;
  raw?: string;
}

export interface IssueGroup {
  canonical: Issue;
  duplicates: Issue[];
  reporters: Reviewer[];
  weight: number;
  tag: AgreementTag;
  severityDisagreement: boolean;
}

export interface ReviewerOutput {
  reviewer: Reviewer;
  output: string;
  exitCode: number;
  timedOut: boolean;
}

export interface FilePackage {
  files: Array<{ path: string; content: string }>;
  summary: string;
}

export interface ReviewContext {
  mode: ReviewMode;
  diff: string;
  changedFiles: string[];
  baseBranch: string;
  prMetadata?: { number: number; title: string; body: string };
}

export interface CliArgs {
  diff?: boolean;
  pr?: boolean;
  plan?: string;
  files?: string[];
  confidence?: number;
  noDebate?: boolean;
}

export interface ReviewerConfig {
  weight: number;
  model?: string;
  maxFiles: number;
  enabled: boolean;
}

export interface Config {
  reviewers: Record<Reviewer, ReviewerConfig>;
  thresholds: {
    confidenceMin: number;
    consensusWeight: number;
    maxIssuesPerReviewer: number;
  };
  debate: {
    maxContestedItems: number;
    timeoutSeconds: number;
  };
  output: {
    directory: string;
    showConfidenceScores: boolean;
    showSeverityDisagreements: boolean;
  };
  categories: string[];
}

export type ReviewerPrompts = Partial<Record<Reviewer, string>>;

export interface TriageResult {
  consensus: IssueGroup[];
  contested: IssueGroup[];
  dismissed: IssueGroup[];
}

export interface DebateChallenge {
  issueId: number;
  reviewer: Reviewer;
  counterEvidence: string;
  attackVector: string;
  verdict: Verdict;
  reasoning: string;
}

export interface RebuttalResponse {
  issueId: number;
  reviewer: Reviewer;
  action: 'DEFEND' | 'CONCEDE';
  response: string;
}

export interface DebateResult {
  resolved: IssueGroup[];
  unresolved: IssueGroup[];
  refuted: IssueGroup[];
}

export interface ReviewStats {
  total: number;
  byReviewer: Record<string, number>;
  unanimous: number;
  strong: number;
  sufficient: number;
  unresolved: number;
  dismissedLowConfidence: number;
  dismissedRefuted: number;
  debateOutcome: string;
}

export interface TribunalReport {
  target: string;
  reviewers: Array<{ name: Reviewer; weight: number }>;
  consensus: IssueGroup[];
  unresolved: IssueGroup[];
  dismissedLowConfidence: IssueGroup[];
  dismissedRefuted: IssueGroup[];
  stats: ReviewStats;
}
