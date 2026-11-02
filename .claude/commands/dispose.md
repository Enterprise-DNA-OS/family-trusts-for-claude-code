---
description: "Record that the trust sold or gave away an asset."
---

# dispose

Record that the trust sold or gave away an asset.

Run `node scripts/trusts.mjs dispose <asset> --on=<YYYY-MM-DD> [--proceeds=<amount>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
