---
description: "Wind up a trust on a date. Refuses while it still holds assets or has open loans, unless --force. Ends every role and keeps every record."
---

# wind-up

Wind up a trust on a date. Refuses while it still holds assets or has open loans, unless --force. Ends every role and keeps every record.

Run `node scripts/trusts.mjs wind-up <trust> --on=<YYYY-MM-DD> [--force] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Confirm with the operator before running: this ends the trust in the records.
