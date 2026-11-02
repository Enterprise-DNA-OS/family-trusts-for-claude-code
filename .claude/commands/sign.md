---
description: "Record a trustee's signature on a resolution after the event."
---

# sign

Record a trustee's signature on a resolution after the event.

Run `node scripts/trusts.mjs sign <resolution> --by=<trustee> [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
