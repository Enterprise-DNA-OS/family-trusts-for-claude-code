---
description: "End a role on a date. A retiring trustee needs the documents handed over (Trusts Act 2019 s 48), the deed of retirement filed and the beneficiaries told."
---

# retire

End a role on a date. A retiring trustee needs the documents handed over (Trusts Act 2019 s 48), the deed of retirement filed and the beneficiaries told.

Run `node scripts/trusts.mjs retire <trust> <person> --role=<role> [--to=<YYYY-MM-DD>] [--docs-passed=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Refuses to remove the last trustee: appoint the replacement first.
