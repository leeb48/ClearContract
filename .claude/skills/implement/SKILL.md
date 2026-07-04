---
name: implement
description: The main driver for ALL code changes in the ClearContract project (quoting/invoicing app for tradespeople). Use whenever the user asks to implement a feature, build a phase from the project plan, write or modify code, fix a bug, refactor, add tests, or make any change to files in web/ or pb/ — even for small edits, and even if they never say "implement". Ensures changes follow the existing codebase's conventions, get verified, and are self-reviewed for bugs before reporting back.
---

# Implement — convention-following code changes for ClearContract

The user is building ClearContract solo, part-time, following `clearcontract_project_plan.md`. When they ask for a code change, they want it done the way the codebase already does things, checked for bugs, and reported back in as few words as possible. They will ask follow-up questions if they want detail — never pre-emptively explain.

## 1. Ground yourself first

Code you write in ignorance of the codebase creates the inconsistencies this skill exists to prevent. Before writing anything:

1. **Find the nearest precedent.** Look for existing code that does something similar to the task — a comparable page, component, hook, schema migration, or test. Read it. Match its file placement, naming, imports, form handling, error handling, and test style. The precedent is the spec for *how*; the task is only the spec for *what*.
2. **Check the plan when precedent is thin.** Early in the build many things have no precedent yet — then `clearcontract_project_plan.md` is the convention source: repo layout (§2.3), data model (§3), API surface (§4), implementation notes (§5), testing strategy (§7). When code and plan disagree, code wins for style, but flag the divergence to the user if it looks accidental.
3. **Check where the build is.** `git log --oneline -10` plus a look at the tree. Don't build against phases that don't exist yet, and don't rebuild what's already there.

### Project invariants (violating these is a bug, not a style choice)

- **Money is integer pence everywhere.** Format only at display edges. Totals are recomputed server-side in hooks — client-computed money is never authoritative.
- **Public pages are token-scoped**, served through sanitizing hook endpoints with allow-listed fields. Never expose collections publicly, never leak `stripe_account_id`, other tokens, or bank details.
- **Sent documents render from `snapshot`**, not live settings.
- **Line items/extras are JSON on the record**, not separate collections.
- **`payments` rows are hook-created only.**
- **Status transitions follow the machine in plan §3.12** — no ad-hoc status writes.
- **Shared business logic lives in pure functions** (`lib/money.ts`, `status.ts`, `placeholders.ts`, zod validators) so it's testable; components and pb_hooks stay thin shells.

## 2. Scope, then build

For anything non-trivial, state the plan in 2–4 terse bullets (files to touch, approach) before writing code — cheap for the user to redirect, expensive to redo. For small obvious changes, skip straight to the edit. If the task is genuinely ambiguous about *what* to build, ask one sharp question; never ask about *how* when the codebase or plan already answers it.

While building:

- New feature code gets tests in the same change, per the plan's testing pyramid (§7): pure-logic gets unit tests, hooks/rules get integration tests. The plan budgets ~¼ of each phase for tests — honor that, don't bolt tests on later.
- Prefer extending an existing pattern over inventing a new one. A second way of doing the same thing is a cost even when it's a better way; if a new pattern is genuinely warranted, say so in one line and let the user decide whether to migrate the old one.

## 3. Verify before reporting

Never report a change as done on faith. Run whatever the repo provides, narrowest scope first:

- Typecheck (`tsc --noEmit`) and lint if configured.
- Tests covering the touched area; the full suite when the change is cross-cutting.
- If verification tooling doesn't exist yet (early phases), say so in one line rather than implying the change was verified.

Fix what verification finds before reporting. Report genuinely unfixable failures as failures, with the one relevant error line — not the full output.

## 4. Self-review the diff

Before reporting, reread the actual diff (`git diff`) with fresh eyes, hunting for:

- **Bugs:** off-by-penny rounding, unhandled null/empty cases, wrong status transitions, missing ownership checks (`user = @request.auth.id`), non-idempotent webhook/view logic, floats touching money.
- **Security:** anything public-facing checked against plan §5.6 — field allow-listing, token handling, rate limiting, MIME/size limits.
- **Leftovers:** debug logs, dead code, TODOs you meant to resolve, commented-out blocks.
- **Refactor signals:** duplication you introduced or worsened, logic that landed in a component/hook instead of a testable pure function.

Fix what you find silently — the user doesn't need a narration of your mistakes. If you spot a pre-existing issue *outside* the task's scope, don't fix it unbidden; note it in one line at the end.

## 5. Report tersely

The user reads reports in a terminal and hates wading through text. The report is a receipt, not an essay:

- Lead with what changed, in one line.
- Bullet the files touched only if there are several; skip the list for one or two obvious files.
- One line of verification results ("typecheck + 14 tests pass", "no test tooling yet — unverified").
- One line per genuine caveat, divergence, or out-of-scope issue spotted. Zero lines if none.
- No headings, no restating the task, no explaining code that speaks for itself, no "next steps" menus.

**Example report:**

> Added `computeQuoteTotals` + cash-discount math to `web/lib/money.ts`, property tests in `money.test.ts`.
> Typecheck clean, 22 tests pass.
> Noticed: plan says fixed deposits cap at discounted total — implemented that way; flag if you expected otherwise.

That's the ceiling, not the floor — a one-line report is fine for a one-line change.
