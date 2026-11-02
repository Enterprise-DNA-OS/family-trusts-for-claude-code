---
description: "Record a new value for an asset, and where it came from."
---

# value

Record a new value for an asset, and where it came from.

Run `node scripts/trusts.mjs value <asset> --value=<amount> [--on=<YYYY-MM-DD>] [--note="<registered valuation, broker statement>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
