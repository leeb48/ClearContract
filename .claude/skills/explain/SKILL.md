---
name: explain
description: Explain how code in the ClearContract project works — what it does, why it was designed that way, and what depends on it. Use whenever the user asks to understand code, a file, a function, a schema, a config, an error, or a concept in this repo — "what does X do", "how does this work", "walk me through", "why is this here", "what happens when" — even for small snippets, and even if they never say "explain". This is a read-only understanding skill, not an implementation or decision-making skill.
---

# Explain — concise code understanding for ClearContract

The user is building ClearContract solo and wants to genuinely understand their own codebase — including the parts that were generated for them. When they ask about code, they want a tight, accurate explanation they can absorb in under a minute. They will ask follow-ups for anything unclear, so resist the urge to pre-answer every possible question: a short answer that invites a follow-up beats a long one that buries the point.

## Ground yourself before explaining

An explanation is only worth reading if it's true of *this* code, not of code like it:

1. **Read the actual code** being asked about — never explain from memory of what it probably says. If behavior depends on callers, callees, or config, glance at those too. What the code does is defined by the code; guessing is how explanations go stale or wrong.
2. **The "why" usually has a paper trail.** Design rationale lives in `clearcontract-project-plan.md` (architecture §2.2, data model §3, implementation notes §5) and `docs/decisions.md` (dated decisions with alternatives and reasons). Check them before inventing a justification — "the plan chose token-based public pages because X" beats a plausible-sounding guess. If the why genuinely isn't recorded anywhere and isn't self-evident, say "this looks like an unrecorded choice" rather than confabulating.
3. **Impacts come from usage.** A quick search for who calls/imports/depends on the thing turns "this might matter" into "changing this breaks the send-quote hook and two tests."

## Answer shape

Three beats, in this order, as short labeled sections or flowing prose (your call — match the question's size):

- **What** — what the code actually does, in plain language. Lead with the one-sentence version, then only the mechanics that matter. Quote at most a line or two of code when a specific expression is the point; never paste blocks back at the user.
- **Why** — why it's built this way: the constraint, decision, or trade-off behind it, citing the plan section or decisions-log entry when one exists. If there was an obvious alternative, name it and why it lost — that's usually the fastest route to real understanding.
- **Impacts** — what depends on it, what would break or change if it were removed or done differently, and any non-obvious consequences (money correctness, security, performance, test coverage).

Reference code as `path/to/file.ts:42` so locations are clickable. Keep the whole answer around one terminal screen; a one-liner question ("what does `lineTotal` do?") deserves a few sentences, not three sections. Depth should track the question, not the file size.

## Style

- Concise but not clipped: complete sentences, technical terms spelled out on first use, no filler ("as you can see", "essentially", "it's worth noting").
- Explain to a competent developer who is new to *this* codebase — assume they know React and SQL; don't assume they know PocketBase hook semantics or why money is integer cents.
- Honesty over polish: if something in the code is surprising, fragile, or looks like a bug, say so in one line. Don't fix it — that's `/implement`'s job — and don't editorialize beyond the one line.
- This skill never modifies files. If the user's question is really a change request in disguise ("why doesn't this handle X?" where X is a missing feature), answer the question, then note the gap belongs to a phase or to `/implement`.

## Example

**Q:** "what does the users.pb.js hook do?"

**A:** **What:** When a new record is created in the `users` collection, `pb/pb_hooks/users.pb.js:4` creates a matching `business_settings` row — quote prefix `TF`, counters at 1, tax off, USD — and links it to the user. It runs after the user is saved (`onRecordAfterCreateSuccess`), so registration itself never fails because of it.
**Why:** Every screen that reads settings assumes the row exists (Phase 1 decision, `docs/decisions.md` 2026-07-05); creating it at registration beats null-checks everywhere. Defaults live here rather than in the schema so they're in one reviewable place.
**Impacts:** The settings page and future quote numbering (§2.2) depend on this row existing. If the hook ever fails silently, that user's Account tab loads forever — worth an integration test assertion, which exists in `web/tests/integration/business-settings.test.ts:5`.
