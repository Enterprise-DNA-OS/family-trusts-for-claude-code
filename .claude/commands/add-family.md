---
description: "Add a client family (the household or group whose trusts you look after)."
---

# add-family

Add a client family (the household or group whose trusts you look after).

Run `node scripts/trusts.mjs add-family <CODE> --name="<name>" [--partner=<name>] [--manager=<name>] [--email=<email>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
