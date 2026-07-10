---
description: Commit staged/unstaged changes and push them to the Treasure Game GitHub repository
argument-hint: [optional commit message]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git remote:*), Bash(git init:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git push:*)
---

## Context

- Repository URL: `https://github.com/iversonsam9191/Treasure_Game.git`
- Optional user-supplied commit message: $ARGUMENTS

## Your task

1. Run `git status` (never `-uall`) to see the current state, and check whether this directory is already a git repository.
   - If it is **not** yet a git repository, run `git init`, then `git remote add origin https://github.com/iversonsam9191/Treasure_Game.git`.
   - If it **is** already a git repository, run `git remote -v` and confirm `origin` points at `https://github.com/iversonsam9191/Treasure_Game.git`. If `origin` is missing, add it; if it points elsewhere, stop and ask the user how to proceed instead of overwriting it.
2. Run `git diff` (staged and unstaged) and `git log --oneline -10` (if any commits exist) to understand what changed and match the existing commit message style.
3. Stage the relevant files explicitly by name (never `git add -A` or `git add .`) — review `git status` output first and exclude anything that looks like a secret, credential, or build artifact that shouldn't be committed (e.g. `server/data/app.db`, `.env`, `node_modules/`, `build/`).
4. Create the commit:
   - If the user passed a message via $ARGUMENTS, use it as-is.
   - Otherwise, draft a concise 1-2 sentence commit message focused on *why* the change was made, based on the diff.
   - Append a trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
5. Determine the current branch name (`git branch --show-current`). If push destination/branch tracking is unclear, or this is the first push to an empty remote, tell the user what will happen (branch name, whether `-u` is needed) **before** pushing.
6. Push to `origin` with the current branch. If the remote has commits this branch doesn't (non-fast-forward), stop and report this to the user instead of force-pushing.
7. Confirm success by showing the final `git status` and the pushed commit hash, and report the GitHub repo URL back to the user.

## Safety notes

- Do not use `--force`, `--force-with-lease`, `--no-verify`, or `-c commit.gpgsign=false`.
- If this is genuinely the first push and requires `git push -u origin <branch>`, that's expected — just say so before doing it.
- If any step is ambiguous (e.g. unclear which untracked files should be committed), ask the user rather than guessing.
