---
name: pr-description
description: Writes pull request descriptions for nuoilon-be. Use when creating a PR, writing a PR body, or summarizing branch changes for review.
---

1. Find the base branch: `gh pr view --json baseRefName -q .baseRefName` if a PR exists; otherwise `develop` for feature branches and `main` for `develop` itself.
2. Read every change: `git log --oneline <base>...HEAD` and `git diff <base>...HEAD`.
3. Flag deploy impact while reading. Each of these gets a line under **Risk**:
   - new or changed file in `src/database/migrations/` (runs against production on merge to `main`)
   - new env var in `src/config/configuration.ts` or `.env.example` (must be added to Vercel / GitHub secrets)
   - new or changed route, guard, or DTO (published API docs change on merge to `main`)
   - change to `.github/workflows/` or `vercel.json`
4. Write the description in this format:

```markdown
## What
One sentence explaining what this PR does.

## Why
Brief context on why this change is needed.

## Changes
- Specific changes, grouped by area
- Files deleted or renamed

## How to test
- Commands or manual steps a reviewer runs to verify

## Risk
- Deploy-impact items from step 3, or "None"
```

Done when every commit in `<base>...HEAD` is reflected under **Changes** and every step-3 item is listed under **Risk**.
