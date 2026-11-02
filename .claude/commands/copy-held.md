---
description: "Record that a trustee holds a copy of the deed or a variation (Trusts Act 2019 s 46)."
---

# copy-held

Record that a trustee holds a copy of the deed or a variation (Trusts Act 2019 s 46).

Run `node scripts/trusts.mjs copy-held <document> --by=<trustee> [--since=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
