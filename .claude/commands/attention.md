---
description: "Show what needs a person today: legal and deed deadlines overdue or due soon (beneficiary income allocated, the 30 June resolution, trustee changes notified, requests answered, documents passed on, basic information considered, vesting), resolutions not signed by every trustee, a sole trustee who is the sole beneficiary, missing core documents and deed copies, minor beneficiary income, family trust election breaches, unpaid entitlements to companies, payments to someone else, missing TFNs, house rules, overdue actions, stale valuations and quiet trusts."
---

# attention

Show what needs a person today: legal and deed deadlines overdue or due soon (beneficiary income allocated, the 30 June resolution, trustee changes notified, requests answered, documents passed on, basic information considered, vesting), resolutions not signed by every trustee, a sole trustee who is the sole beneficiary, missing core documents and deed copies, minor beneficiary income, family trust election breaches, unpaid entitlements to companies, payments to someone else, missing TFNs, house rules, overdue actions, stale valuations and quiet trusts.

Run `node scripts/trusts.mjs attention`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything that breaks a statute or the deed, and name the rule. Suggest the one next step for each line (usually `/notify`, `/answer`, `/sign`, `/draft-resolution`, `/copy-held`, `/upe-loan`, `/value` or `/draft-minutes`).
