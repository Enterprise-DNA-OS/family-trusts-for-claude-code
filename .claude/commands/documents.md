---
description: "List the documents on file for a trust, where each is held, and which trustees hold a copy."
---

# documents

List the documents on file for a trust, where each is held, and which trustees hold a copy.

Run `node scripts/trusts.mjs documents [<trust>] [--kind=<kind>]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
