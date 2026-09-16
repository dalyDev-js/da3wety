# Codex prompt — execute Plan 1

Run from the repo root (`C:\Users\abd91\OneDrive\Desktop\Projects\da3wety`) with Docker Desktop running and
`npx supabase start` done. Paste everything below the line into Codex.

---

<task>
Implement the plan in docs/superpowers/plans/2026-09-16-plan-1-e2e-and-invitation-extras.md, task by task, in order.
The plan implements sub-project E of docs/superpowers/specs/2026-09-16-v1.1-growth-features-design.md; read both first, plus AGENTS.md and README.md.
This is a Next.js 16 App Router app (Turbopack) with Drizzle 0.45 + a local Supabase CLI stack, zod 4, next-intl 4, motion 13, Tailwind 4 / shadcn, Playwright 1.63, vitest 4. Next 16 differs from your training data: read node_modules/next/dist/docs/ for any API you touch.
Scope: Tasks 1 through 9 fully, and Task 10 Step 1 (bundle check) only. Do NOT run Task 10 Steps 2-4 (production migration, git push, README): stop and report instead.
</task>

<completeness_contract>
Done means: every checkbox in Tasks 1-9 is ticked in the plan file; each task ended with `npm run typecheck && npm run lint && npx vitest run` green; `npm run test:e2e` passes from Task 1 onward (all e2e tests green at the end of Tasks 5, 6, 8, 9); one commit per task using the plan's commit message plus the trailer lines "Co-Authored-By: Codex <noreply@openai.com>" on its own line at the end.
Follow the plan's code verbatim where it gives code; where it says "check how X is built", read the file and adapt to what is actually there without changing unrelated behaviour.
</completeness_contract>

<verification_loop>
Before each commit: run the gate above and, for tasks that touch guest pages, load http://localhost:3000/e/lhtestev01 in the Playwright Chrome channel and confirm no console errors.
After Task 2: confirm `drizzle/0002_*.sql` contains only the theme enum and four ADD COLUMN statements, and that a second `npm run db:migrate` is a no-op.
If an e2e selector in the plan does not match the DOM, fix the selector (prefer getByRole/getByLabel with the Arabic|English regex pattern the plan uses); do not weaken the assertion.
</verification_loop>

<default_follow_through_policy>
Keep going without asking when the plan is explicit. Choose the plan's stated default when two readings are possible. Never modify files under drizzle/ by hand; only `npm run db:generate` writes there. Never touch .env.prod or any production credential. Never `git push`.
</default_follow_through_policy>

<missing_context_gating>
Stop and report (do not guess) only if: the local Supabase stack is not reachable, `npm run db:generate` produces a migration with DROP statements, or an existing test that passed before your change starts failing for a reason unrelated to the task.
</missing_context_gating>

<action_safety>
Stay inside the files listed in each task's "Files" block plus messages JSON and tests. No dependency upgrades, no refactors of unrelated code, no formatting-only commits (run `npx prettier --write` on the files you change, inside the task's commit). Keep Arabic strings exactly as given in the plan.
</action_safety>

<compact_output_contract>
Progress: one line per task when it is committed: "Task N: <commit sha> — <tests: unit X passed, e2e Y passed>".
Final report, in this order: (1) list of commits; (2) plan deviations, each with file:line and why; (3) the Task 10 Step 1 bundle numbers before/after for /e/[slug]; (4) anything left for a human (production migration, push, README).
</compact_output_contract>
