@AGENTS.md

## Orchestration rules

Main session runs on Fable. Fable tokens are the scarcest resource here (they burn weekly quota fastest and have their own 50% weekly cap), so anything that doesn't need Fable's judgment leaves the main session.

* Main session: plan, decide, brief workers, read their summaries, review diffs, verify, explain to the user. Keep this context small.
* Subagents: `Explore` (haiku) for read-only search and tracing; `worker` (sonnet) for edits, tests, builds, mechanical work, fetching docs. Never run a worker on Fable. Never fork the conversation: a fork runs on the main model and carries the whole context with it.
* Delegate when the work would dump a lot of text into this context, is mechanical, or can run in parallel: reading or searching more than ~3 files to answer a question -> Explore; test suite, build, linter, anything with long output -> worker, "failures only"; the same edit across many files, renames, boilerplate, fixtures -> worker; independent investigations -> up to 3 workers in parallel, never more.
* Do it here when the change is small and targeted (1-2 files, location known), depends on the conversation or a decision just made, or the steps are sequential and share state.
* Never delegate: architecture choices, deciding what to build, and the final check before telling the user something is done.
* One task per worker. Every brief has: the goal in one sentence including what "done" means; the exact files or directories in scope; what not to do (files not to touch, no new dependencies, no refactors outside scope, no git commits); the return format (max 15 lines: what changed, what was verified and how, open problems; no file dumps, no diffs). Workers can't ask questions: blocked or unsure means stop and report, not improvise.
* A worker summary is a claim, not a fact. Check `git diff --stat`, read the relevant hunks, and run (or have a worker run) the tests/build. Never tell the user something works without having verified it in this session. If a worker went out of scope, revert that part before continuing.
* Escalate one worker to `opus` only when a sonnet worker failed the same task twice, or for a security/review pass on a large change. State why in the brief.
* The user doesn't read code. Explain what changed and what was verified in plain language. Say clearly when something is a guess or untested. Ask before anything destructive: deleting files, dropping data, force-pushing, rewriting history.
