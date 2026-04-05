import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Config } from './types.js';

export const DEFAULT_CONFIG: Config = {
  reviewers: {
    codex: { weight: 1.0, model: 'gpt-5.3-codex', maxFiles: 20, enabled: true },
    gemini: { weight: 0.5, maxFiles: 50, enabled: true },
    claude: { weight: 1.0, maxFiles: 50, enabled: true },
  },
  thresholds: { confidenceMin: 70, consensusWeight: 1.5, maxIssuesPerReviewer: 15 },
  debate: { maxContestedItems: 10, timeoutSeconds: 300 },
  output: { directory: 'reviews', showConfidenceScores: true, showSeverityDisagreements: true },
  categories: ['bug', 'security', 'architecture', 'performance', 'testing', 'style'],
};

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = snakeToCamel(k);
    result[key] = v && typeof v === 'object' && !Array.isArray(v)
      ? convertKeys(v as Record<string, unknown>)
      : v;
  }
  return result;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof result[k] === 'object') {
      result[k] = deepMerge(result[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export async function loadConfig(projectRoot: string): Promise<Config> {
  try {
    const raw = await readFile(join(projectRoot, '.codex-review.yaml'), 'utf-8');
    const parsed = parseYaml(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CONFIG };
    const converted = convertKeys(parsed as Record<string, unknown>);
    return validateConfig(
      deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, converted) as unknown as Config,
    );
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function validateConfig(config: Config): Config {
  const { confidenceMin, consensusWeight } = config.thresholds;
  if (confidenceMin < 0 || confidenceMin > 100) throw new Error('confidenceMin must be 0-100');
  if (consensusWeight < 0 || consensusWeight > 2.5) throw new Error('consensusWeight must be 0-2.5');
  return config;
}
