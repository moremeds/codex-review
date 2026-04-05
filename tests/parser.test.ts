import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseIssues } from '../src/parser.js';

const fixturesDir = join(import.meta.dirname, 'fixtures');

describe('parseIssues', () => {
  it('parses well-formed output into issues', () => {
    const output = readFileSync(join(fixturesDir, 'codex-output.txt'), 'utf-8');
    const issues = parseIssues(output, 'codex');
    expect(issues).toHaveLength(2);
    expect(issues[0].severity).toBe('CRITICAL');
    expect(issues[0].file).toBe('src/cli.ts');
    expect(issues[0].line).toBe(42);
    expect(issues[0].title).toBe('Unchecked null return from getConfig');
    expect(issues[0].confidence).toBe(92);
    expect(issues[0].category).toBe('bug');
    expect(issues[0].reviewer).toBe('codex');
  });

  it('extracts all fields from second issue', () => {
    const output = readFileSync(join(fixturesDir, 'codex-output.txt'), 'utf-8');
    const issues = parseIssues(output, 'codex');
    expect(issues[1].severity).toBe('MINOR');
    expect(issues[1].confidence).toBe(55);
  });

  it('handles malformed output gracefully', () => {
    const output = readFileSync(join(fixturesDir, 'malformed-output.txt'), 'utf-8');
    const issues = parseIssues(output, 'gemini');
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues[0].file).toBe('src/foo.ts');
    expect(issues.find(i => i.file === 'src/bar.ts')).toBeDefined();
  });

  it('returns empty array for "No issues found"', () => {
    const issues = parseIssues('No issues found. The code looks good.', 'claude');
    expect(issues).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    const issues = parseIssues('', 'codex');
    expect(issues).toHaveLength(0);
  });
});
