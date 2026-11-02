---
description: "Australia: record that a beneficiary has quoted a TFN to the trustee. The number itself is never stored here."
---

# tfn-quoted

Australia: record that a beneficiary has quoted a TFN to the trustee. The number itself is never stored here.

Run `node scripts/trusts.mjs tfn-quoted <person> --actor="<your name>"`. Add `--json` when you need every field. Resolve the trust, person, resolution or request by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<your name>"`.
