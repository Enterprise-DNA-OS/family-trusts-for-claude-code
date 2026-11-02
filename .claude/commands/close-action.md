---
description: "Close an action with its outcome."
---

# close-action

Close an action with its outcome.

Run `node scripts/trusts.mjs close-action <action> [--outcome="<what happened>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
