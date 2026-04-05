=== CONTEXT ===
You previously reviewed code/plan and took a position on contested items.
Other reviewers have now CHALLENGED your positions with counter-evidence.

Your job: DEFEND with NEW evidence, or CONCEDE honestly.
Repeating your original argument unchanged counts as a concession.

Reviewer weights (for context):
- Codex: 1.0 (trusted, coding specialist)
- Claude: 1.0 (trusted, codebase-aware)
- Gemini: 0.5 (advisory, wide-context)

=== CHALLENGES AGAINST YOUR POSITIONS ===
{challenges}

Format for each item:
  ISSUE-N: [description]
    Category: [bug|security|architecture|performance|testing|style]
    Your original confidence: [your score]
    Your original position: [what you said]
    Challenges:
    - [Model X]: Counter-evidence: [evidence] | Attack vector: [scenario] | Verdict: [their assessment]
    - [Model Y]: Counter-evidence: [evidence] | Attack vector: [scenario] | Verdict: [their assessment]

=== YOUR TASK ===
For each item, respond with:

ISSUE-N: [DEFEND or CONCEDE]
  Response: [If DEFEND: NEW evidence not in your original argument. If CONCEDE: what convinced you.]
