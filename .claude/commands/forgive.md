---
description: "Record a forgiveness (a gift) on a loan the trust owes. Needs the resolution or deed that records the gift."
---

# forgive

Record a forgiveness (a gift) on a loan the trust owes. Needs the resolution or deed that records the gift.

Run `node scripts/trusts.mjs forgive <loan> --amount=<amount> --resolution=<resolution> [--on=<YYYY-MM-DD>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Record the gift first with `/resolve --kind=gift`. Check the effect on any means-tested entitlement with the client's adviser before forgiving.
