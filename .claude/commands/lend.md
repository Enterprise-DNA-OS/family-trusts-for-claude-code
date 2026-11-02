---
description: "Open a loan: a settlor or family member lends the trust money (or with --owed-to-trust, the trust lends out), with its first advance."
---

# lend

Open a loan: a settlor or family member lends the trust money (or with --owed-to-trust, the trust lends out), with its first advance.

Run `node scripts/trusts.mjs lend <trust> <person> --amount=<amount> [--on=<YYYY-MM-DD>] [--terms="<terms>"] [--owed-to-trust] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Then file the loan agreement with `/add-document --kind=loan-agreement`.
