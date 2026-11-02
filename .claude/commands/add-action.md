---
description: "Add a follow-up action with an owner and a due date, optionally against a trust."
---

# add-action

Add a follow-up action with an owner and a due date, optionally against a trust.

Run `node scripts/trusts.mjs add-action [<trust>] --what="<what>" --due=<YYYY-MM-DD> [--owner=<name>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
