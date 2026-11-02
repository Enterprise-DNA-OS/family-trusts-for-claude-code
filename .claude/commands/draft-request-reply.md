---
description: "Draft the reply to a beneficiary's information request: given, part or refused."
---

# draft-request-reply

Draft the reply to a beneficiary's information request: given, part or refused.

Run `node scripts/trusts.mjs draft-request-reply <request> [--outcome=given|part|refused]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

After sending, record it with `/answer`.
