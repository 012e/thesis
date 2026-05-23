---
name: git-conflict-rebase
description: Resolve Git merge and rebase conflicts safely. Use this skill whenever the user asks to fix conflicts, continue a rebase, handle a merge conflict, recover from an interrupted rebase or merge, or says Git is blocked by unmerged files. It first detects whether the repository is in a merge or rebase, resolves conflicts without destructive Git commands, and for rebases repeatedly runs `GIT_EDITOR=true git rebase --continue` until the rebase is complete or a real blocker needs user input.
---

# Git Conflict And Rebase Resolver

Use this skill to resolve Git conflicts in a working tree while preserving user work. The main distinction is whether Git is currently doing a merge or a rebase: merge conflicts finish by staging resolved files, while rebase conflicts must continue commit-by-commit until Git reports the rebase is done.

## Safety Rules

- Start by inspecting state. Run `git status --short --branch` and inspect `.git` state with safe read-only commands before editing.
- Do not use destructive commands such as `git reset --hard`, `git checkout -- <file>`, `git restore <file>`, `git rebase --abort`, or `git merge --abort` unless the user explicitly asks for that exact action.
- Do not overwrite unrelated local changes. If an unrelated dirty file is not part of the conflict, leave it alone.
- Resolve conflicts by understanding both sides. Do not blindly choose `ours` or `theirs` unless the user explicitly requested it or the file is generated and the repository has a clear regeneration step.
- Before continuing a rebase or finishing a merge, stage only files that were intentionally resolved or intentionally part of the current replayed commit. This can include newly added files created by the commit being rebased.

## Detect The Operation

Run these checks before editing conflicts:

```bash
git status --short --branch
test -d .git/rebase-merge -o -d .git/rebase-apply && printf 'rebase\n' || true
test -f .git/MERGE_HEAD && printf 'merge\n' || true
```

If `.git` is a file because the repository uses a linked worktree or submodule layout, use `git rev-parse --git-dir` and check inside that directory instead:

```bash
git_dir=$(git rev-parse --git-dir)
test -d "$git_dir/rebase-merge" -o -d "$git_dir/rebase-apply" && printf 'rebase\n' || true
test -f "$git_dir/MERGE_HEAD" && printf 'merge\n' || true
```

Interpretation:

- Rebase in progress: `rebase-merge` or `rebase-apply` exists.
- Merge in progress: `MERGE_HEAD` exists and no rebase state is active.
- No operation in progress: Git may still have unresolved files from another operation. Use `git status` to decide the next safe step, and explain the state to the user.

## Conflict Resolution Workflow

1. Identify conflicted files with `git diff --name-only --diff-filter=U`.
2. Read each conflicted file and understand the conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`.
3. Edit each file to remove conflict markers and preserve the correct combined behavior.
4. For delete/modify, rename/rename, binary, lockfile, generated, or schema conflicts, inspect `git status` and the surrounding project conventions before choosing a resolution.
5. Run focused validation when feasible. Prefer the smallest relevant formatter, typecheck, test, or build command over a broad expensive command unless the conflict affects many areas.
6. Confirm no conflict markers remain with a content search for `<<<<<<<|=======|>>>>>>>` in the resolved files.
7. Stage only resolved conflict files with `git add <file...>`. During a rebase, also inspect `git status --short --branch` for files already introduced by the current replayed commit, including `A`/`??` new files. If they are part of the commit being replayed and not unrelated local work, stage them too; `git rebase --continue` may refuse to proceed until all intended additions, deletions, and modifications for that commit are in the index.

## Merge Completion

For a merge:

1. After resolving and staging files, run `git status --short --branch`.
2. If no unmerged paths remain, stop and report that the merge conflicts are resolved and staged.
3. Do not create the merge commit unless the user explicitly asked you to commit. Many users want to inspect before committing.

## Rebase Completion Loop

For a rebase, conflict resolution can repeat across multiple commits. After resolving and staging the current conflicts, continue the rebase non-interactively:

```bash
GIT_EDITOR=true git rebase --continue
```

Then loop:

1. Run `git status --short --branch`.
2. If Git reports more unmerged paths, resolve them using the conflict workflow above.
3. Stage resolved files. Also stage any new, deleted, or modified files that belong to the current replayed commit and are required for the commit to be complete; do not stage unrelated dirty files.
4. Run `GIT_EDITOR=true git rebase --continue` again.
5. Repeat until Git reports the rebase is complete.

If `git rebase --continue` fails because there are no changes for a commit, inspect the message. If Git says the patch is already applied and suggests skipping, ask the user before running `git rebase --skip` unless the user already authorized skipping empty commits.

If `git rebase --continue` opens or requires commit message editing, keep using `GIT_EDITOR=true` so the existing commit message is accepted without an interactive editor.

## Generated Files And Lockfiles

- If a conflicted file is generated, prefer regenerating it from source after resolving the source file, but only if the repository has an obvious command and the command is safe.
- For package lockfiles, prefer the package manager's install or lockfile update command over manual marker edits when feasible.
- For generated route trees, API clients, schemas, or build outputs, check repository guidance before editing manually.

## Reporting Back

Keep the final response concise and include:

- Whether Git was in a merge, rebase, or neither.
- Files resolved.
- Validation commands run and their result.
- Current Git state.
- If a rebase completed, say that `GIT_EDITOR=true git rebase --continue` was repeated until complete.
- If blocked, state the exact command or file that blocked progress and the decision needed from the user.
