---
description: "Write every table to one JSON file you can keep or move anywhere."
---

# export

Write every table to one JSON file you can keep or move anywhere.

Run `node scripts/trusts.mjs export [--out=<file.json>]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

The file holds confidential family information: tell the operator where it was written.
