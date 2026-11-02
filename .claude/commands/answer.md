---
description: "Record the answer to a request: given, part or refused. A part answer or refusal needs the reasons."
---

# answer

Record the answer to a request: given, part or refused. A part answer or refusal needs the reasons.

Run `node scripts/trusts.mjs answer <request> --outcome=given|part|refused [--reason="<s 53 factors>"] [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Draft the reply first with `/draft-request-reply`.
