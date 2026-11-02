---
description: "Record money paid out on a distribution, and to whom if it was not the beneficiary."
---

# paid

Record money paid out on a distribution, and to whom if it was not the beneficiary.

Run `node scripts/trusts.mjs paid <distribution> --amount=<amount> [--on=<YYYY-MM-DD>] [--to="<who received it>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

If the money went to someone other than the beneficiary in an Australian trust, flag it for an s 100A review.
