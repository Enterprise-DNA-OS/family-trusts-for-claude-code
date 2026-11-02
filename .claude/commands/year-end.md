---
description: "Year end for every trust that distributes: the resolution, the distributions and the accounts for the last finished year (or --year)."
---

# year-end

Year end for every trust that distributes: the resolution, the distributions and the accounts for the last finished year (or --year).

Run `node scripts/trusts.mjs year-end [--year=<YYYY>]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with trusts whose resolution is overdue or due soon. For a New Zealand trust the window is 6 months after balance date; for an Australian trust it is 30 June or the deed's earlier date.
