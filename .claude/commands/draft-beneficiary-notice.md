---
description: "Draft the basic trust information letter (Trusts Act 2019 s 51(3)): that they are a beneficiary, the trustees and how to reach them, any trustee changes, and their right to ask. New Zealand trusts."
---

# draft-beneficiary-notice

Draft the basic trust information letter (Trusts Act 2019 s 51(3)): that they are a beneficiary, the trustees and how to reach them, any trustee changes, and their right to ask. New Zealand trusts.

Run `node scripts/trusts.mjs draft-beneficiary-notice <trust> [<beneficiary>]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Weigh the section 53 factors for this beneficiary before it goes. After sending, record it with `/notify`.
