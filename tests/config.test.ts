import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_CONFIG, loadConfig, validateConfig } from '../src/config.js';

describe('DEFAULT_CONFIG', () => {
  it('has correct threshold values', () => {
    expect(DEFAULT_CONFIG.thresholds.confidenceMin).toBe(70);
    expect(DEFAULT_CONFIG.thresholds.consensusWeight).toBe(1.5);
  });

  it('has all three reviewers', () => {
    expect(DEFAULT_CONFIG.reviewers.codex.weight).toBe(1.0);
    expect(DEFAULT_CONFIG.reviewers.gemini.weight).toBe(0.5);
    expect(DEFAULT_CONFIG.reviewers.claude.weight).toBe(1.0);
  });
});

describe('loadConfig', () => {
  it('returns defaults when no yaml file exists', async () => {
    const config = await loadConfig('/nonexistent/path');
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});

describe('validateConfig', () => {
  it('rejects negative confidence_min', () => {
    const bad = { ...DEFAULT_CONFIG, thresholds: { ...DEFAULT_CONFIG.thresholds, confidenceMin: -1 } };
    expect(() => validateConfig(bad)).toThrow();
  });

  it('rejects consensus_weight > 2.5', () => {
    const bad = { ...DEFAULT_CONFIG, thresholds: { ...DEFAULT_CONFIG.thresholds, consensusWeight: 3.0 } };
    expect(() => validateConfig(bad)).toThrow();
  });
});
