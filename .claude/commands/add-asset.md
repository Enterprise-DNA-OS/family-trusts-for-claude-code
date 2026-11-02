---
description: "Add an asset the trust holds."
---

# add-asset

Add an asset the trust holds.

Run `node scripts/trusts.mjs add-asset <trust> --description="<what>" --kind=property|shares|cash|loan-receivable|business|vehicle|other [--acquired=<YYYY-MM-DD>] [--cost=<amount>] [--value=<amount>] [--valued=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
