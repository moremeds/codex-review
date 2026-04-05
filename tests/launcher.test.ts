import { describe, it, expect, vi } from 'vitest';
import { checkAvailability } from '../src/launcher.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

import { execSync } from 'node:child_process';
const mockExec = vi.mocked(execSync);

describe('checkAvailability', () => {
  it('returns true when which succeeds', () => {
    mockExec.mockReturnValue(Buffer.from('/usr/bin/codex'));
    expect(checkAvailability('codex')).toBe(true);
  });

  it('returns false when which fails', () => {
    mockExec.mockImplementation(() => { throw new Error(); });
    expect(checkAvailability('gemini')).toBe(false);
  });

  it('always returns true for claude', () => {
    expect(checkAvailability('claude')).toBe(true);
  });
});
