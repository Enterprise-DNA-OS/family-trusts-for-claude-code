---
description: "Record a beneficiary's share under a distribution resolution, as an amount or a percentage. Warns on a New Zealand beneficiary under 16 over $1,000, an Australian beneficiary outside the family group, and a missing TFN."
---

# distribute

Record a beneficiary's share under a distribution resolution, as an amount or a percentage. Warns on a New Zealand beneficiary under 16 over $1,000, an Australian beneficiary outside the family group, and a missing TFN.

Run `node scripts/trusts.mjs distribute <resolution> <beneficiary> (--amount=<amount> | --share=<percent>) [--kind=income|capital|franked|capital-gain] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Refuses anyone who was not a beneficiary on the day, and shares over 100%. Show every warning to the operator.
