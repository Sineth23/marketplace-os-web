# Marketplace OS Web engineering guide

This repository owns the Next.js frontend and Vercel configuration. Read [README.md](README.md) for its current behavior. The separate `marketplace-os` repository owns backend APIs, database, AWS CDK, product decisions, and provider setup documentation.

## Product boundaries

- Use authenticated backend HTTP contracts for tenant data. A browser organization ID is only a selector; the backend verifies identity and current membership for every tenant read or write.
- Keep provider credentials, refresh tokens, database connections, and privileged API clients out of browser code and Vercel frontend configuration.
- Clearly label previews and sample data. Do not present an unconnected marketplace as live.

## Development and publication

- Start independent work on a new `codex/<short-topic>` branch from the latest intended base, normally `origin/main`. Inspect the branch, worktrees, and working tree first. Continue an existing branch only for the same change, and preserve unrelated edits.
- Run focused checks while editing. Before shipping a frontend feature, run the applicable `pnpm check` and `pnpm build` commands; report any pre-existing or environment blockers. A documentation-only edit needs a documentation/format check.
- After implementing and validating a requested change, commit and push its task branch and open or update a **draft PR** without asking again. An explicit narrower request such as "local only," "commit only," or "no PR" overrides this default. Stage only task files; never amend, reset, or force-push. If authentication or validation blocks publication, preserve the branch and explain the blocker.
- Do not merge or manually deploy to production as part of shipping. GitHub pushes and PRs may trigger configured CI or Vercel preview builds; report their actual status separately from local checks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
