---
name: Long jobs in the agent sandbox
description: How to run mining/indexing jobs that exceed the 120s bash limit
---

The agent bash sandbox kills background processes between calls (nohup/setsid don't survive) and caps each command at 120s.

**Why:** discovered while running Autocomplete mining (~3k requests) and batch embedding jobs for the blog mechanism.

**How to apply:** write resumable chunk scripts under `.local/tmp/` with a JSON state file (list of completed clusters/items) and an internal time budget (~80s), then re-invoke until the script prints a "done" marker. Batch external API calls (e.g. embeddings 512/request) to fit budgets.
