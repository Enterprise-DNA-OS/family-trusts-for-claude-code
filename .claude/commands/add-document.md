---
description: "File a document against a trust: deed, variation, financial statements, minutes, appointment, retirement, memorandum of wishes, contract, valuation, loan agreement, election."
---

# add-document

File a document against a trust: deed, variation, financial statements, minutes, appointment, retirement, memorandum of wishes, contract, valuation, loan agreement, election.

Run `node scripts/trusts.mjs add-document <trust> --kind=<kind> --title="<title>" [--dated=<YYYY-MM-DD>] [--year=<YYYY>] [--person=<person>] [--held-at="<where>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Financial statements need `--year`; an appointment or retirement needs `--person`.
