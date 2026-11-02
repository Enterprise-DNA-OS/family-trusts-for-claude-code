---
description: "Bring trusts and people across from a trust register export (comma-separated). Dry run first. Import trusts, then people."
---

# import

Bring trusts and people across from a trust register export (comma-separated). Dry run first. Import trusts, then people.

Run `node scripts/trusts.mjs import trust-manager <file.csv> --kind=trusts|people --dry-run --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Always run with `--dry-run` first and show the counts. One bad row stops the whole file: fix the row or map the column with `--map=<file.json>` (see docs/replace-cch-trust-manager.md).
