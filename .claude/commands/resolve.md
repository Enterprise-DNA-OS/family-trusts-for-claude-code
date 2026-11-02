---
description: "Record a trustee resolution and who signed it. Only a trustee in office that day can sign; it warns until every trustee has signed, unless the deed allows a majority."
---

# resolve

Record a trustee resolution and who signed it. Only a trustee in office that day can sign; it warns until every trustee has signed, unless the deed allows a majority.

Run `node scripts/trusts.mjs resolve <trust> --kind=distribution|annual-review|appointment|retirement|investment|loan|gift|information|general --summary="<what was decided>" [--year=<YYYY>] [--on=<YYYY-MM-DD>] [--signed="<name>, <name>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

A distribution resolution needs `--year`, the income year it is for, named for the year it ends in. Then record each beneficiary with `/distribute`.
