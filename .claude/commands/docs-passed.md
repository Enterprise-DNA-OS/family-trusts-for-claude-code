---
description: "Record the day a retired trustee handed the trust documents to a continuing trustee (Trusts Act 2019 s 48)."
---

# docs-passed

Record the day a retired trustee handed the trust documents to a continuing trustee (Trusts Act 2019 s 48).

Run `node scripts/trusts.mjs docs-passed <trust> <person> [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
