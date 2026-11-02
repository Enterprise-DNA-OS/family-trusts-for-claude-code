---
description: "Give a person a role in a trust from a date. A new trustee comes with the next steps: the deed of appointment, a copy of the deed, and (New Zealand) the beneficiaries told."
---

# appoint

Give a person a role in a trust from a date. A new trustee comes with the next steps: the deed of appointment, a copy of the deed, and (New Zealand) the beneficiaries told.

Run `node scripts/trusts.mjs appoint <trust> <person> --role=trustee|settlor|appointor|protector|beneficiary|default-beneficiary [--from=<YYYY-MM-DD>] [--outside-family] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Check the deed gives the power to appoint and who holds it (usually the appointor). Refuses a trustee under 18 and a duplicate role.
