---
description: "Draft the year-end distribution resolution for a trust, with every current beneficiary listed, last year's figures for reference and the signing block, to drafts/."
---

# draft-resolution

Draft the year-end distribution resolution for a trust, with every current beneficiary listed, last year's figures for reference and the signing block, to drafts/.

Run `node scripts/trusts.mjs draft-resolution <trust> [--year=<YYYY>]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

New Zealand defaults to the last finished year (allocate within 6 months of balance date); Australia defaults to the current year (resolve by 30 June). Never fill in amounts the operator has not given.
