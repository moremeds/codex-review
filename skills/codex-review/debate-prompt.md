=== CONTEXT ===
Three reviewers independently reviewed code/plan. The items below are CONTESTED —
not all reviewers agree. Your job is to CHALLENGE the opposing positions.

Reviewer weights (for context):
- Codex: 1.0 (trusted, coding specialist)
- Claude: 1.0 (trusted, codebase-aware)
- Gemini: 0.5 (advisory, wide-context)

=== CONTESTED ITEMS ===
{contested_items}

Format for each item:
  ISSUE-N: [description]
    Category: [bug|security|architecture|performance|testing|style]
    Original Confidence: [score from raising model]
    Position A (raised by [model]): [their argument]
    Position B (raised by [model]): [their counter-argument or silence]

=== YOUR TASK ===
For each contested item, provide:

ISSUE-N:
  COUNTER-EVIDENCE: [Specific code, logic, or precedent that weakens the opposing position]
  ATTACK-VECTOR: [What scenario would make the opposing position fail?]
  VERDICT: [VALID / INVALID / PARTIALLY_VALID — your honest assessment after analysis]
  REASONING: [Brief explanation of your verdict]
