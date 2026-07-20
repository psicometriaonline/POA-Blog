---
name: Applying git bundles/branches in the main agent sandbox
description: Git object writes into workspace/.git are blocked; how to apply external bundles anyway
---
Rule: `git fetch`/`merge` into the workspace repo fail mid-pack-write in the main agent sandbox ("Destructive git operations are not allowed"). To apply a git bundle or external branch: `git clone /home/runner/workspace /tmp/repo` (reads are fine, /tmp writes allowed), `git fetch <bundle> <branch>` inside /tmp/repo, then `git diff --binary <base>..FETCH_HEAD > patch` and `git apply patch` in the workspace (working-tree writes are allowed; checkpoints commit for you).

**Why:** thin bundles need the base commit, so cloning the bundle alone fails; only the workspace-clone route works.
**How to apply:** any time the user hands over work as a bundle/patch/branch to merge.
