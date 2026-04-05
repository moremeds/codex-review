import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectContext } from '../src/context.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
const mockExec = vi.mocked(execSync);

beforeEach(() => { mockExec.mockReset(); });

describe('detectContext', () => {
  it('throws if not in a git repo', async () => {
    mockExec.mockImplementation(() => { throw new Error('not a git repo'); });
    await expect(detectContext({})).rejects.toThrow('Not inside a git repository');
  });

  it('uses diff mode when --diff flag is set', async () => {
    mockExec.mockImplementation((cmd: string) => {
      if (cmd.includes('rev-parse')) return Buffer.from('true');
      if (cmd.includes('git diff HEAD') && !cmd.includes('--name-only')) return Buffer.from('diff content');
      if (cmd.includes('--name-only')) return Buffer.from('src/foo.ts\n');
      return Buffer.from('');
    });
    const ctx = await detectContext({ diff: true });
    expect(ctx.mode).toBe('diff');
    expect(ctx.diff).toBe('diff content');
  });

  it('auto-detects diff when git status has output', async () => {
    mockExec.mockImplementation((cmd: string) => {
      if (cmd.includes('rev-parse')) return Buffer.from('true');
      if (cmd.includes('status --short')) return Buffer.from(' M src/foo.ts\n');
      if (cmd.includes('git diff HEAD') && !cmd.includes('--name-only')) return Buffer.from('diff');
      if (cmd.includes('--name-only')) return Buffer.from('src/foo.ts\n');
      return Buffer.from('');
    });
    const ctx = await detectContext({});
    expect(ctx.mode).toBe('diff');
  });
});
