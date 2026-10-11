# LOOP protocol (applies to every prompt)

## The loop
1. PLAN: read AGENTS.md, docs/PROGRESS.md and the spec sections named in the prompt.
   Write a plan of at most 10 lines: files to touch, risks. Then continue without waiting
   unless something is ambiguous enough to risk wasted work.
2. BUILD: implement only what the prompt asks for. Keep changes small and typed.
3. VERIFY: run the commands listed in the prompt. For UI work, use the browser agent:
   open the running app, perform the listed actions, take screenshots, and compare them
   with docs/design-system.md (including the anti-template checklist).
4. FIX: if any check fails, fix and re-verify. Maximum 3 fix iterations.
   If it still fails, STOP and report: the exact failing command or screen, the error,
   and your best hypothesis. Do not keep trying random changes.
5. RECORD: tick the loop in docs/PROGRESS.md; add decisions, known issues, and the
   next loop. Commit with `area: change`.
6. REPORT: at most 10 lines: what changed, what was verified, what is still open.

## Stop conditions
- Never add a dependency outside the approved list.
- Never touch files outside the task scope.
- Never mark a loop done if `npm run test` or `npm run lint` fails.

## Resume prompt (paste when you start a new session, switch account, or after quota resets)
Read AGENTS.md, docs/LOOP.md and docs/PROGRESS.md. Tell me in 5 lines where the project
stands and which loop is next. Run `npm run test` and `npm run lint` and report the
results. Then stop and wait for me to paste the next loop.

## Design critique loop (run after UI loops)
Follow docs/LOOP.md. Open the running app with the browser agent. For each route
(/, /patient/:id with all tabs, /portal, /audit) in light and dark theme at 1366x768:
screenshot, then score against the anti-template checklist in docs/design-system.md.
List every failure with the file and component responsible. Fix all failures that are
styling-only. Re-screenshot to confirm. Report remaining items as a short list.

## Bug triage prompt (when something is broken and you do not know why)
Follow docs/LOOP.md. Symptom: <describe in one line>. Reproduce it first with a test
or a browser run. Find the root cause (state it in one sentence), fix the cause rather
than the symptom, add a regression test, and verify with `npm run test`.