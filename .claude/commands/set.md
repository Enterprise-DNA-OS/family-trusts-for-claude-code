---
description: "Change a house rule."
---

# set

Change a house rule.

Run `node scripts/trusts.mjs set <key> <value> [--note="<why>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Only change a setting the operator asks for. The statutory rules are not settings.
