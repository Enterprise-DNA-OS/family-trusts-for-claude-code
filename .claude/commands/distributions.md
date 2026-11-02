---
description: "List distributions by trust and year (--unpaid for entitlements not yet paid)."
---

# distributions

List distributions by trust and year (--unpaid for entitlements not yet paid).

Run `node scripts/trusts.mjs distributions [<trust>] [--year=<YYYY>] [--unpaid]`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
