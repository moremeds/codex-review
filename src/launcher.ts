import { execSync, spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Reviewer, Config, ReviewerPrompts, ReviewerOutput } from './types.js';

export function checkAvailability(reviewer: Reviewer): boolean {
  if (reviewer === 'claude') return true;
  try {
    execSync(`which ${reviewer}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function spawnReviewer(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1, timedOut });
    });
  });
}

export async function launchReviewers(
  config: Config,
  prompts: ReviewerPrompts,
): Promise<ReviewerOutput[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'codex-review-'));
  const timeoutMs = config.debate.timeoutSeconds * 1000;

  const tasks: Array<Promise<ReviewerOutput>> = [];

  const reviewerCommands: Record<Reviewer, { cmd: string; buildArgs: (promptFile: string) => string[] }> = {
    codex: {
      cmd: 'codex',
      buildArgs: (f) => ['exec', '-s', 'read-only', `$(cat ${f})`],
    },
    gemini: {
      cmd: 'gemini',
      buildArgs: (f) => ['-p', `$(cat ${f})`, '--approval-mode', 'plan', '-o', 'text'],
    },
    claude: {
      cmd: 'claude',
      buildArgs: (f) => ['-p', `$(cat ${f})`, '--allowedTools', 'Read,Grep,Glob,Bash'],
    },
  };

  for (const [reviewer, prompt] of Object.entries(prompts) as [Reviewer, string][]) {
    if (!prompt || !config.reviewers[reviewer]?.enabled) continue;
    if (!checkAvailability(reviewer)) continue;

    const promptFile = join(tmpDir, `${reviewer}-prompt.txt`);
    await writeFile(promptFile, prompt, { mode: 0o600 });

    const { cmd, buildArgs } = reviewerCommands[reviewer];
    const shellCmd = `${cmd} ${buildArgs(promptFile).join(' ')}`;

    tasks.push(
      spawnReviewer('bash', ['-c', shellCmd], timeoutMs).then((result) => ({
        reviewer: reviewer as Reviewer,
        output: result.stdout,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
      })),
    );
  }

  const results = await Promise.allSettled(tasks);
  await rm(tmpDir, { recursive: true, force: true });

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { reviewer: 'codex' as Reviewer, output: '', exitCode: 1, timedOut: false },
  );
}
