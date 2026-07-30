# How This Project Was Built

A general account of building notes-app with AI agents, written for someone who wasn't in the room.
It covers the method, what the agents actually decided, what went wrong, and how the work was checked.

Built 29–30 July 2026.

---

## The short version

The application was not written in one pass from a prompt. It was built **spec-first**: a written
specification came before any design, a design before any task list, and a task list before any code.
Each stage produced a document committed to the repository, so the reasoning behind the code is still
readable today.

Nine distinct stages ran, each handled by a separate agent with its own fresh context and a narrow
job. A coordinating agent held the thread, validated each stage's output before starting the next, and
stopped to ask a human whenever a decision was genuinely a product call rather than a technical one.

The result: **4 documents, 59 tasks, 5 pull requests, 71 automated tests**, and an independent
verification pass that checked every requirement against the actual source code.

---

## The method: spec-driven development

The workflow came from **gentle-ai**, a configuration layer that installs a spec-driven development
(SDD) process into an AI coding tool. Its central idea is that the expensive mistakes in software
happen before anyone writes code — in misunderstood requirements and unexamined assumptions — so it
forces those into writing first.

The stages, in order:

| Stage | Produced |
|---|---|
| **init** | Project configuration; recorded the target stack |
| **propose** | Scope, exclusions, and a slice plan |
| **spec** | Acceptance criteria per domain, as testable Given/When/Then scenarios |
| **design** | Technical decisions with rationale and rejected alternatives |
| **tasks** | 59 actionable items, each tagged with the requirements it satisfies |
| **apply** ×5 | The implementation, one reviewable slice at a time |
| **verify** | An independent audit against the specification |

Artifacts were stored as **files in the repository** rather than in an agent's memory. That choice was
deliberate: files are reviewable in pull requests, survive in git history, and remain legible without
any particular tool installed.

---

## What the human decided, and what the agents decided

This distinction matters more than it might seem.

**The agents were not allowed to invent scope.** When the specification listed six unresolved
questions — password rules, the sign-up button label, pagination, date casing, timestamp formats,
whether to show a zero count — the agents did not quietly pick answers. They carried them forward as
explicit blockers, and a human resolved all six before any specification was written. Those answers
were recorded in `decisions.md` and treated as binding for every later stage.

The human also decided: the technology stack, that specs live in files, how the work would be split
into pull requests, and the review-size budget.

**The agents decided everything technical** — data models, API shapes, component structure, library
choices, test strategy — and each decision came with its reasoning and the alternatives it rejected.

---

## Three things the agents caught that a human might not have

These are the clearest evidence that the process earned its overhead.

**A seeding strategy that could never have worked.** Every new account needs three default categories.
The instruction offered two implementation options: a database migration or a signal. The design agent
rejected *both* and explained why the migration option was not merely worse but impossible — a
migration runs once over rows that already exist and would never see a future signup. It proposed a
service called during account creation instead. Had the migration been chosen, the bug would have
appeared only for the second user onward.

**A timestamp default that would have corrupted note ordering.** Notes sort by "last edited." The
obvious Django idiom for such a field, `auto_now=True`, updates the timestamp on *every* save — so
merely recategorizing a note would have silently jumped it to the top of the list. The design agent
flagged this before any code existed and specified an explicit timestamp, updated only when the title
or content actually changes.

**A security setting that broke every authenticated write.** During the final slice, all logged-in
writes were rejected. The cause was subtle: the development proxy forwards requests to the backend
under a different hostname, so the framework's origin check never matched the browser's real origin.
It stayed hidden through four slices because sign-up and login are exempt from that check by design —
the fifth slice was the first to make an authenticated write. The agent found it while running the
mandated pre-submit checks, diagnosed it, fixed it, and documented why it had lain dormant.

---

## What went wrong

An honest account has to include this part.

**The original execution route collapsed mid-project.** The intent was to run the work through an
existing personal-assistant agent configured as a development lead. Three problems surfaced in
sequence: that agent is a dispatcher that delegates rather than writes code, and the tool it delegates
to was not installed; its configured model identifiers had been retired by the provider and no longer
existed; and once those were fixed, the provider's free daily request quota turned out to be exhausted
account-wide, returning rate-limit errors on every available model.

The planning stages had already completed before the collapse, so nothing was lost. The work moved to
a different agent runtime — the same spec-driven process, the same artifact files, a more capable
model — and continued from exactly where it stopped. Configuration backups were taken before every
change, so the original setup remains restorable.

**Estimates were significantly wrong, and said so.** The task breakdown forecast about 2,250 lines of
change. The real total was roughly **4,050**. Every slice reported its actual size against its
forecast rather than absorbing the difference quietly. The largest gap was the first slice — two
complete framework scaffolds at roughly twice its estimate. Test code accounted for much of the rest.

**Transient infrastructure failures.** The design stage failed three times in a row on server overload
errors. Rather than retrying indefinitely or silently downgrading the approach, the situation was
surfaced as a decision for the human, who chose to retry. It succeeded on the fourth attempt.

---

## How the work was delivered

Five pull requests, each chained onto the previous one so reviewers see only that slice's changes:

| # | Slice | Scope |
|---|---|---|
| 1 | Planning artifacts | Specification and design documents, no code |
| 2 | Scaffold + auth | Both applications, session authentication, design tokens |
| 3 | Categories | Category model, per-account seeding, counts endpoint |
| 4 | Notes API | Note model, CRUD endpoints, ordering, ownership scoping |
| 5 | Dashboard | Sidebar filtering, note cards, Markdown previews, empty state |
| 6 | Editor | The editor, autosave lifecycle, empty-note discard |

Slicing was not cosmetic. A single pull request of ~4,000 lines does not get meaningfully reviewed. It
also produced real engineering benefits: the Notes slice went back and completed a deliberate
placeholder the Categories slice had left behind, because the dependency it needed finally existed.

Every commit uses conventional commit format. No commit carries AI attribution — a standing project
rule, and it held across all slices.

---

## How it was checked

Three independent layers, because an agent reporting on its own work is not evidence.

**Automated tests**, written alongside the code, not after: 40 backend tests, 27 frontend unit and
component tests, and 4 end-to-end tests driving a real browser at the target viewport.

**Coordinator verification.** Every stage's claims were checked against reality before the next stage
began — commits confirmed to exist, test suites re-run independently, and specific constraints grepped
directly out of the source. This caught nothing false, but that conclusion is only meaningful because
it was actually tested rather than assumed.

**An independent audit stage.** A separate agent, told explicitly not to trust the implementers'
self-reports, read the source and re-ran every command. Its verdict on the 35 requirements: **34 pass,
1 partial, 0 fail.** It confirmed all six binding decisions in code, ran six security spot-checks, and
verified that nothing from the out-of-scope list had crept in.

The single partial is a wording matter, not a defect: the specification says the timestamp updates
"in real-time," and it updates via half-second debounced autosave rather than on every keystroke. The
implementing agent disclosed this itself rather than claiming a clean sweep.

---

## What was deliberately not built

Scope discipline was checked, not assumed. None of the following exists in the codebase, because none
of it was requested: category management, search, tags, pinning, archiving, attachments, sort controls
beyond the category filter, sharing or multi-user features, responsive layouts, offline sync, or
notifications.

**Note deletion is also absent**, and this is the subtlest scope decision in the project. Deleting
notes was classified as a wishlist item, not a requirement. But one requirement *does* say a note
opened and closed while still empty must not persist. Rather than building general deletion and
calling it done, the design produced a narrowly guarded endpoint that refuses to delete anything
containing text. The audit verified the guard cannot be bypassed.

---

## What this cost, and what it bought

The overhead was real: six rounds of human decisions, four planning documents before a line of code,
and a coordinating agent that re-verified everything.

What it bought: two design-stage catches that would each have become production bugs, a runtime bug
found and explained rather than papered over, complete traceability from every requirement to the code
and test that satisfies it, an audit trail of *why* each decision was made, and five pull requests a
human can actually review.

The clearest signal is the honesty of the failures. Estimates were wrong and reported as wrong. A
model provider's quota ran out and the route changed rather than the standards dropping. One
requirement is partial and labelled partial. Nothing was claimed as passing that had not been
observed passing.

---

## Where to look next

| To understand | Read |
|---|---|
| What was asked for | `REQUIREMENTS.md` |
| Which questions were open, and their answers | `openspec/changes/notes-app-mvp/decisions.md` |
| Why the code is shaped as it is | `openspec/changes/notes-app-mvp/design.md` |
| What was built, and requirement coverage | `openspec/changes/notes-app-mvp/tasks.md` |
| Whether it does what was specified | `openspec/changes/notes-app-mvp/verify-report.md` |
| How to run it | `README.md` |
