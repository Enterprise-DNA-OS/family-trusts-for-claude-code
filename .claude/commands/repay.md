---
description: "Record a repayment on a loan. Never more than the balance."
---

# repay

Record a repayment on a loan. Never more than the balance.

Run `node scripts/trusts.mjs repay <loan> --amount=<amount> [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
