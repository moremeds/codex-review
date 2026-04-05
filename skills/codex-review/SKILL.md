---
name: codex-review
description: Three-way AI tribunal code review using Codex, Gemini, and Claude with weighted consensus, structured debate, and rebuttal phases.
---

# Codex Tribunal Review

Three independent AI reviewers (Codex, Gemini, Claude) analyze code in parallel with weighted consensus. Contested items go through structured debate + rebuttal.

## Usage

```bash
npx tsx src/cli.ts              # auto-detect (diff → PR → plan → branch-diff)
npx tsx src/cli.ts --diff       # review uncommitted changes
npx tsx src/cli.ts --pr         # review current PR
npx tsx src/cli.ts --plan FILE  # review a plan document
npx tsx src/cli.ts --files a.ts b.ts  # review specific files
npx tsx src/cli.ts --no-debate  # skip debate phase
npx tsx src/cli.ts --confidence 80    # custom confidence threshold
```

## Reviewers

| Reviewer | Weight | Specialty |
|----------|--------|-----------|
| Codex (gpt-5.3-codex) | 1.0 | Bug detection |
| Gemini | 0.5 | Cross-file consistency |
| Claude | 1.0 | Integration correctness |

Graceful degradation: 3-way → 2-way → Claude-only if tools unavailable.

## Configuration

Place `.codex-review.yaml` in your project root. See the example in the plugin repo.

## Output

Reports saved to `reviews/review-{timestamp}.md` with consensus items, unresolved items (with debate transcript), dismissed items, and stats.
