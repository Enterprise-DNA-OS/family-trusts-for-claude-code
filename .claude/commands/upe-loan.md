---
description: "Australia: record that a company beneficiary's unpaid entitlement is on a complying loan agreement (Division 7A)."
---

# upe-loan

Australia: record that a company beneficiary's unpaid entitlement is on a complying loan agreement (Division 7A).

Run `node scripts/trusts.mjs upe-loan <distribution> --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Then file the loan agreement with `/add-document --kind=loan-agreement`.
