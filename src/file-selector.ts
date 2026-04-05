import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import type { ReviewContext, Config, FilePackage } from './types.js';

interface RankedFile {
  path: string;
  changes: number;
}

export function rankFilesByDiffSize(numstat: string): RankedFile[] {
  return numstat
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [ins, del, path] = line.split('\t');
      return { path, changes: (parseInt(ins, 10) || 0) + (parseInt(del, 10) || 0) };
    })
    .sort((a, b) => b.changes - a.changes);
}

export function findTestFile(filePath: string): string[] {
  const dir = dirname(filePath);
  const base = basename(filePath).replace(/\.(ts|js|tsx|jsx)$/, '');
  const ext = filePath.match(/\.(ts|js|tsx|jsx)$/)?.[1] ?? 'ts';
  return [
    join(dir, `${base}.test.${ext}`),
    join(dir, `${base}.spec.${ext}`),
    `tests/${base}.test.${ext}`,
    `tests/${dir}/${base}.test.${ext}`,
  ];
}

async function readFileSafe(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf-8'); } catch { return null; }
}

export async function selectFiles(
  context: ReviewContext,
  config: Config,
): Promise<{ slim: FilePackage; rich: FilePackage }> {
  let numstat: string;
  try {
    numstat = execSync(
      context.mode === 'pr' ? 'gh pr diff --stat' : `git diff ${context.baseBranch} --numstat`,
      { encoding: 'utf-8' },
    );
  } catch {
    numstat = context.changedFiles.map(f => `1\t1\t${f}`).join('\n');
  }

  const ranked = rankFilesByDiffSize(numstat);
  const slimFiles = ranked.slice(0, config.reviewers.codex.maxFiles);
  const richFiles = ranked.slice(0, config.reviewers.gemini.maxFiles);

  const slim: FilePackage = {
    files: await Promise.all(
      slimFiles.map(async f => ({ path: f.path, content: (await readFileSafe(f.path)) ?? '' })),
    ),
    summary: `${slimFiles.length} files (slim context)`,
  };

  const rich: FilePackage = {
    files: await Promise.all(
      richFiles.map(async f => ({ path: f.path, content: (await readFileSafe(f.path)) ?? '' })),
    ),
    summary: `${richFiles.length} files (rich context)`,
  };

  return { slim, rich };
}
