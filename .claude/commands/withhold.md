---
description: "Record a decision to withhold basic trust information from a beneficiary, with the section 53 factors the trustees weighed."
---

# withhold

Record a decision to withhold basic trust information from a beneficiary, with the section 53 factors the trustees weighed.

Run `node scripts/trusts.mjs withhold <trust> <beneficiary> --reason="<the s 53 factors weighed>" [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Then minute it with `/resolve --kind=information`.
