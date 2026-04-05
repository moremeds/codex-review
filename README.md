# codex-review

A Claude Code plugin that runs **three-way AI tribunal code reviews** using Codex, Gemini, and Claude with weighted consensus, structured debate, and rebuttal phases.

## How It Works

Three independent AI reviewers analyze your code in parallel, each with a different specialty:

| Reviewer | Weight | Specialty |
|----------|--------|-----------|
| **Codex** (gpt-5.3-codex) | 1.0 | Bug detection: edge cases, off-by-one, null/undefined, race conditions |
| **Gemini** | 0.5 | Cross-file consistency: API contracts, import graph, architectural patterns |
| **Claude** | 1.0 | Integration correctness: CLAUDE.md compliance, test coverage, call-site impact |

After independent reviews, findings are merged using weighted consensus. Contested items go through a structured **debate + rebuttal** process before being resolved or escalated to you.

### Review Phases

1. **Independent Reviews** - All three reviewers analyze the code in parallel
2. **Merge & Triage** - Deduplicate issues, calculate weighted agreement
3. **Consensus** - Items where reviewers agree (weight >= 1.5) are accepted
4. **Debate & Rebuttal** - Contested items go through challenge/defense rounds
5. **Final Output** - Merged review with consensus, unresolved, and dismissed items

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- [Codex CLI](https://github.com/openai/codex) installed (`which codex`)
- [Gemini CLI](https://github.com/google/gemini-cli) installed (`which gemini`) - optional, degrades gracefully

## Installation

### From GitHub

```bash
# Add the marketplace
/plugin marketplace add moremeds/codex-review

# Install the plugin
/plugin install codex-review@codex-review
```

### Local Testing

```bash
# Clone the repo
git clone https://github.com/moremeds/codex-review.git

# Test locally
claude --plugin-dir ./codex-review
```

## Usage

```
/codex-review:codex-review                              # Auto-detect context
/codex-review:codex-review src/server/pipeline.py       # Review specific file(s)
/codex-review:codex-review --plan docs/plans/design.md  # Review a plan
/codex-review:codex-review --pr                         # Review current PR
/codex-review:codex-review --diff                       # Review uncommitted changes
```

### Context Auto-Detection

The skill automatically detects what to review in this order:

1. Uncommitted changes (git diff)
2. Active PR on current branch
3. Recent plan files
4. Full diff against main branch

## Graceful Degradation

| Availability | Behavior |
|-------------|----------|
| Codex + Gemini | Full tribunal (3-way weighted) |
| Codex only | Bilateral (Codex + Claude, 2-way) |
| Gemini only | Bilateral (Gemini + Claude, Gemini upgraded to weight 1.0) |
| Neither | Claude-only review with warning |

## Output

Reviews are saved to `reviews/review-{timestamp}.md` with:
- **Consensus items** - Agreed issues with severity and resolution
- **Unresolved items** - Full debate transcript for your decision
- **Dismissed items** - Low confidence or refuted issues
- **Stats** - Issue counts by reviewer, agreement strength, debate outcome

## License

MIT
