# AGENTS.md
Mar de Estrelas: a WebGL2/Three.js journey from the Sun, through the real star catalogue, to a 3D Milky Way, with an explorable solar-system Atlas near home. Built for its owner, who does not program and judges by screenshots; published on GitHub Pages for anyone.
Keep this file under 50 lines; every agent reads every line, every session. Add a line only after the same mistake happens twice; when a line can become a check (lint rule, test, hook), do that and delete the line.
Commands

* Setup: `npm ci`
* Done means: `npm run done` (typecheck + lint + tests) passes. Run it once, at the end, before you say a task is finished.
* While working, run only the tests for what you touched: `npm run test:tocados` picks them from the files you changed. Only commands with non-obvious arguments go here; the rest is in the manifests.

How to work

* Before starting: if the request seems mistaken, has a simpler path, or misses something (existing code, an edge case, security), say so in one or two sentences. Then do what was asked, unless it's on the ask list. State any assumption.
* Do what was asked, no more. If you spot a bug or an improvement nearby, leave it and add one line to `BACKLOG.md`.
* Before writing a helper, component, or util, look for an existing one and extend it. One way to do each thing.
* Do the simplest thing that works. No abstractions, options, or config for needs that don't exist yet.
* Change as little as possible: targeted edits, not whole-file rewrites. Match the patterns already in the file; formatting is the linter's job.
* When you replace something, delete the old version. No commented-out code, unused functions, or leftover files.
* Create new files (docs, tests, scripts, notes) only when the task needs them. Delete scratch files before you finish.
* Tests go where the task asks, or where this repo already keeps tests for that kind of change. One focused test per behavior, sized like the neighbors.
* If you can delegate (main session only): keep judgment (plan, decide, hard bugs, review) and hand execution (search, reading many files, tests, mechanical edits) to workers on a cheaper model, so your own context stays small. Each worker gets one task, the files, and what not to do; workers return a summary and never ask.
* When done, say plainly what changed and what you did not do. If something failed, show the output.
* One commit per task; the message says why, not what. Push only to the backup branch: `git push origin main:backup`.

When to ask
Go ahead on your own with anything local and easy to undo. Stop and ask only when:

* the action is hard to undo or touches shared things: deleting data, migrations, force-push, publishing, secrets, pushing `main` (it publishes the site), regenerating `public/data`, adding tests or image judges beyond what the task needs (the owner approves that list at the end of a round);
* the request needs a second way of doing something the project already does one way;
* two readings of the request would lead to clearly different work.

Otherwise pick a sensible option, say what you assumed, and keep going. If nobody is watching (unattended run), don't ask: write the assumption, or "BLOCKED: <reason>", and stop.
Traps (not obvious from the code, caused a mistake before; one line each, with the reason; max 5)

* `base: './'` in vite.config.ts must stay relative — the site lives under a subpath on GitHub Pages, and `'/'` breaks the data loading only in production, never in dev.
* Every push to `main` publishes the site (deploy.yml runs on it). Back up without publishing: `git push origin main:backup`.
* One NaN pixel plus bloom turns the whole screen white — `pow` with a negative base and `smoothstep` with reversed edges are the usual sources; `?nobloom=1` shows the scene behind it.
* `npm test` imports `scripts/visual/chrome.mjs`, which locates the Chrome binary at import time — without Chrome the suite fails for reasons unrelated to `src/`.
* `capturas/` and `sky/` are ignored by git and hold the only copy of each proof image — never overwrite one; write a `-v2` beside it.

Memory

* The repo is the memory: code, git history, and the two files below. Don't create other notes, summaries, or docs on your own.
* `PLAN.md` (root, optional): for a task that spans sessions or is handed to another model. First line: task and date; then steps in order, files involved, decisions already made, and what's out of scope. Mark steps done as you go. If you find one you didn't write, read it first. Delete when done.
* `BACKLOG.md` (root, max 30 lines): things noticed but not done, one line each. When it's full, triage before adding. The owner's own list is `docs/PENDENCIAS.md`: read only its first section (O BASTÃO) before starting, and write there only what he reports, in his words.
* Don't edit this file during normal work; if a rule seems missing, say so in your final message. Anything that must always happen (formatting, blocked commands) lives in hooks, linters, or CI, not here.
