---
description: "Add a person, company, trust or charity that holds a role. Records whether an Australian beneficiary has quoted a TFN, never the number."
---

# add-person

Add a person, company, trust or charity that holds a role. Records whether an Australian beneficiary has quoted a TFN, never the number.

Run `node scripts/trusts.mjs add-person <CODE> --name="<name>" [--kind=individual|company|trust|charity] [--dob=<YYYY-MM-DD>] [--email=<email>] [--phone=<phone>] [--address=<address>] [--tfn] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Never record a tax file number or IRD number for a person here.
