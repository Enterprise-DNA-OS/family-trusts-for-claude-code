---
description: "Record that basic trust information was given (to one beneficiary, or every beneficiary when no --to), or that beneficiaries were told of a trustee appointment or retirement (Trusts Act 2019 s 51)."
---

# notify

Record that basic trust information was given (to one beneficiary, or every beneficiary when no --to), or that beneficiaries were told of a trustee appointment or retirement (Trusts Act 2019 s 51).

Run `node scripts/trusts.mjs notify <trust> --kind=basic-info|trustee-change [--to=<beneficiary>] [--trustee=<trustee>] [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Draft the letter first with `/draft-beneficiary-notice`. A trustee change needs `--trustee`.
