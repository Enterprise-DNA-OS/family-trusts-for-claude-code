---
description: "Add a note to a trust: a call, email, meeting or letter."
---

# note

Add a note to a trust: a call, email, meeting or letter.

Run `node scripts/trusts.mjs note <trust> --text="<what happened>" [--kind=call|email|meeting|letter|note] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
