import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { CliArgs, ReviewContext } from './types.js';

function exec(cmd: string): string | null {
  try {
    const raw = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const result = typeof raw === 'string' ? raw : (raw as unknown as Buffer).toString('utf-8');
    return result.trim() || null;
  } catch {
    return null;
  }
}

export async function detectContext(args: CliArgs): Promise<ReviewContext> {
  if (!exec('git rev-parse --is-inside-work-tree')) {
    throw new Error('Not inside a git repository');
  }

  if (args.diff) return diffContext();
  if (args.pr) return prContext();
  if (args.plan) return planContext(args.plan);
  if (args.files?.length) return filesContext(args.files);

  // Auto-detect waterfall
  const status = exec('git status --short');
  if (status) return diffContext();

  const prJson = exec('gh pr view --json number,title,body,baseRefName');
  if (prJson) return prContext();

  return branchDiffContext();
}

function diffContext(): ReviewContext {
  return {
    mode: 'diff',
    diff: exec('git diff HEAD') ?? '',
    changedFiles: (exec('git diff HEAD --name-only') ?? '').split('\n').filter(Boolean),
    baseBranch: 'HEAD',
  };
}

function prContext(): ReviewContext {
  const prJson = exec('gh pr view --json number,title,body,baseRefName');
  const meta = prJson ? JSON.parse(prJson) : {};
  return {
    mode: 'pr',
    diff: exec('gh pr diff') ?? '',
    changedFiles: (exec('gh pr diff --name-only') ?? '').split('\n').filter(Boolean),
    baseBranch: meta.baseRefName ?? 'main',
    prMetadata: meta.number ? { number: meta.number, title: meta.title, body: meta.body } : undefined,
  };
}

async function planContext(planFile: string): Promise<ReviewContext> {
  const content = await readFile(planFile, 'utf-8');
  return { mode: 'plan', diff: content, changedFiles: [planFile], baseBranch: '' };
}

function filesContext(files: string[]): ReviewContext {
  return { mode: 'files', diff: '', changedFiles: files, baseBranch: '' };
}

function branchDiffContext(): ReviewContext {
  const base = exec('git merge-base main HEAD') ? 'main' : 'master';
  return {
    mode: 'branch-diff',
    diff: exec(`git diff ${base}...HEAD`) ?? '',
    changedFiles: (exec(`git diff ${base}...HEAD --name-only`) ?? '').split('\n').filter(Boolean),
    baseBranch: base,
  };
}
