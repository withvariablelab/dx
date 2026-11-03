# Architectural decisions

This directory records architectural choices for `@rrlab/*` where the answer wasn't obvious and the rationale is worth preserving for future agents.

## Format

One file per decision: `NNN-<slug>.md`, sequentially numbered starting at `001`. Numbers don't get reused even if a decision is later overridden (delete the file in that case, the next decision still numbers from the highest used + 1).

Each file follows this template:

```markdown
# NNN: [one-sentence question]

- **Date**: YYYY-MM-DD
- **Status**: Applied | Pending human review | Overridden | Rejected
- **Files affected**: [list]

## Context
[2-3 sentences. What's the situation, where in the code, what's at stake.]

## Options considered
- **A**: [name] — [1-line description]
- **B**: [name] — [1-line description]

## Decision: Option [X]
[2-4 sentences. Why this option, with reference to related decisions or code patterns.]

## Alternatives rejected
- Option [Y]: [1-line reason]

## Notes for human review
[Optional. Anything the human should know when reviewing.]
```

## When to add an entry

Add an entry every time you invoke `arch-critic` and apply its recommendation. Do NOT add entries for:

- Bugs fixed or tests written.
- Mechanical changes (file moves, renames, import updates).
- Stylistic choices that just match existing code.

## Status semantics

- **Applied**: code is in main, tests green, decision is in effect.
- **Pending human review**: applied but the implementer flagged it as uncertain.
- **Overridden**: a previously _Applied_ decision that a human later disagreed with; superseded by a newer decision. Either delete the file (preferred when the override fully replaces it) or leave the file and add a "→ See NNN" pointer at the top.
- **Rejected**: a proposal that was reviewed (typically by `arch-critic`) and never applied. Keep the file when the _reasoning behind the rejection_ is the part worth preserving — i.e. when "we considered X and chose not to do it because Y" is load-bearing for future readers tempted by the same idea. Add a "→ Rejected — see NNN" header pointing to whatever decision (if any) absorbed the substantive parts.
