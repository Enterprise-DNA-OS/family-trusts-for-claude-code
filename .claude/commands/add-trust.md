---
description: "Add a trust: family, jurisdiction, establishment date, vesting day, balance month, and for Australia the deed's resolution date and any family trust election."
---

# add-trust

Add a trust: family, jurisdiction, establishment date, vesting day, balance month, and for Australia the deed's resolution date and any family trust election.

Run `node scripts/trusts.mjs add-trust <CODE> --name="<name>" --family=<family> --jurisdiction=NZ|AU --established=<YYYY-MM-DD> [--vesting=<YYYY-MM-DD>] [--balance-month=<1-12>] [--resolve-by=<MM-DD>] [--fte=<YYYY-MM-DD>] [--majority] [--accumulates] [--tax-ref=<number>] [--held-at=<where the deed is>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.

Read the deed first: the vesting day, whether a majority of trustees can decide, and (Australia) any earlier resolution date. A New Zealand trust with no vesting day ends 125 years from creation (Trusts Act 2019 s 16).
