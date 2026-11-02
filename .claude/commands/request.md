---
description: "Log a beneficiary's request for trust information. Starts the clock (Trusts Act 2019 s 52: a reasonable period; the house rule sets the days)."
---

# request

Log a beneficiary's request for trust information. Starts the clock (Trusts Act 2019 s 52: a reasonable period; the house rule sets the days).

Run `node scripts/trusts.mjs request <trust> <beneficiary> --what="<what they asked for>" [--received=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
