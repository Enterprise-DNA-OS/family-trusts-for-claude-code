---
description: "Every dated obligation rolled up by rule: how many are overdue, due soon, done late and done, with the source. Then run each check in docs/compliance.md."
---

# compliance

Every dated obligation rolled up by rule: how many are overdue, due soon, done late and done, with the source. Then run each check in docs/compliance.md.

Run `node scripts/trusts.mjs compliance`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then read `docs/compliance.md` and report the non-dated checks from `/attention` (s 38 signatures, s 46 copies, HC 35, Sch 2F, Div 7A, s 100A, TFN). Breached first. If a rule looks out of date, say so and stop: do not guess at law.
