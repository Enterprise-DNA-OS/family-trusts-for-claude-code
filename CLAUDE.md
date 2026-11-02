# Family Trusts for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR PRACTICE: an accounting or law practice, or a trustee company, that administers family trusts]
- **Operator:** [YOUR NAME], [your role: partner, trust administrator, client manager]
- **What matters most:** [for example: every distribution resolution made inside the window, every trustee change notified, no beneficiary request left past 20 days]

The work is family trust administration in New Zealand and Australia: client families, trusts and their deeds, the people register (trustees, settlors, appointors, protectors, beneficiaries), trust property, settlor loans and gifting, trustee resolutions and who signed them, distributions, the core documents and who holds a copy, basic trust information and beneficiaries' requests, follow-up actions and notes.

## Rules

- Read the CLI result before answering. Every answer about a trust, a person, a resolution or a distribution starts with data from `node scripts/trusts.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- These are confidential family and financial records. Show them only to the operator. Never paste them into anything outside this folder.
- Never decide for the trustees. Record what they resolved, who signed and when. Never choose a beneficiary, an amount or a share the operator has not given.
- A deadline a statute or the deed sets is a deadline. If `/attention` shows one overdue, say so first, with the rule. If a command refuses (a signer who was not a trustee that day, a beneficiary who was not one, shares over 100%, forgiving a loan with no resolution), say why and stop. Never look for a way around it.
- Never store a tax file number or an IRD number for a person. `tfn_quoted` records only that a beneficiary quoted one.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a date, a figure, a clause of the deed or a signature. Copy them from the deed, the resolution, the accounts or the operator.
- Never send, pay, sign or delete. Letters, resolutions, minutes and reviews are drafts in `drafts/`; documents are in `docs-out/`. Recording a notice or a payment does not make it happen; a person does that. Trust records are never deleted, and the database refuses.
- The rules in `docs/compliance.md` are records checks, not legal or tax advice. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Follow-up actions, open by default (--all includes closed ones). | `/actions` |
| What changed recently and who changed it, from the append-only log. | `/activity` |
| Add a follow-up action with an owner and a due date, optionally against a trust. | `/add-action` |
| Add an asset the trust holds. | `/add-asset` |
| File a document against a trust: deed, variation, financial statements, minutes, appointment, retirement, memorandum of wishes, contract, valuation, loan agreement, election. | `/add-document` |
| Add a client family (the household or group whose trusts you look after). | `/add-family` |
| Add a person, company, trust or charity that holds a role. Records whether an Australian beneficiary has quoted a TFN, never the number. | `/add-person` |
| Add a trust: family, jurisdiction, establishment date, vesting day, balance month, and for Australia the deed's resolution date and any family trust election. | `/add-trust` |
| Record the answer to a request: given, part or refused. A part answer or refusal needs the reasons. | `/answer` |
| Give a person a role in a trust from a date. A new trustee comes with the next steps: the deed of appointment, a copy of the deed, and (New Zealand) the beneficiaries told. | `/appoint` |
| The trust property: what each trust holds, cost, value and when it was valued (--all includes disposals). | `/assets` |
| Show what needs a person today: legal and deed deadlines overdue or due soon (beneficiary income allocated, the 30 June resolution, trustee changes notified, requests answered, documents passed on, basic information considered, vesting), resolutions not signed by every trustee, a sole trustee who is the sole beneficiary, missing core documents and deed copies, minor beneficiary income, family trust election breaches, unpaid entitlements to companies, payments to someone else, missing TFNs, house rules, overdue actions, stale valuations and quiet trusts. | `/attention` |
| Close an action with its outcome. | `/close-action` |
| Every dated obligation rolled up by rule: how many are overdue, due soon, done late and done, with the source. Then run each check in docs/compliance.md. | `/compliance` |
| Record that a trustee holds a copy of the deed or a variation (Trusts Act 2019 s 46). | `/copy-held` |
| The core documents a trustee keeps (Trusts Act 2019 s 45), trust by trust: deed, variations, last year's accounts, decisions, appointment records, memorandum of wishes, asset records. | `/core-documents` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record that the trust sold or gave away an asset. | `/dispose` |
| Record a beneficiary's share under a distribution resolution, as an amount or a percentage. Warns on a New Zealand beneficiary under 16 over $1,000, an Australian beneficiary outside the family group, and a missing TFN. | `/distribute` |
| List distributions by trust and year (--unpaid for entitlements not yet paid). | `/distributions` |
| Record the day a retired trustee handed the trust documents to a continuing trustee (Trusts Act 2019 s 48). | `/docs-passed` |
| Render the paperwork in documents.json (the register of trustees and beneficiaries, the schedule of trust property, distribution resolutions, beneficiary statements) to docs-out/ in your brand. | `/docs` |
| List the documents on file for a trust, where each is held, and which trustees hold a copy. | `/documents` |
| Draft the basic trust information letter (Trusts Act 2019 s 51(3)): that they are a beneficiary, the trustees and how to reach them, any trustee changes, and their right to ask. New Zealand trusts. | `/draft-beneficiary-notice` |
| Draft the minutes of the annual trustee review: deed, people, property, loans and the matters to decide, to drafts/. | `/draft-minutes` |
| Draft the reply to a beneficiary's information request: given, part or refused. | `/draft-request-reply` |
| Draft the year-end distribution resolution for a trust, with every current beneficiary listed, last year's figures for reference and the signing block, to drafts/. | `/draft-resolution` |
| Draft a one-page trust summary for the client meeting: people, property, loans, four years of distributions and open items. | `/draft-summary` |
| Write every table to one JSON file you can keep or move anywhere. | `/export` |
| List the client families with their partner, manager, active trusts and overdue obligations. | `/families` |
| One client family: its trusts and everything overdue or due soon across them. | `/family` |
| Record a forgiveness (a gift) on a loan the trust owes. Needs the resolution or deed that records the gift. | `/forgive` |
| Bring trusts and people across from a trust register export (comma-separated). Dry run first. Import trusts, then people. | `/import` |
| Answer the ten questions the practice software cannot: holdings by family, settlor loans and gifting, who received what, missed deadlines by manager, resolution timing, trustees of several trusts, beneficiaries never told, minors' allocations, stale valuations and trusts vesting. | `/insights` |
| Open a loan: a settlor or family member lends the trust money (or with --owed-to-trust, the trust lends out), with its first advance. | `/lend` |
| Loans to and from each trust: advanced, repaid, forgiven and the balance. | `/loans` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Add a note to a trust: a call, email, meeting or letter. | `/note` |
| Basic trust information given, trustee changes notified, and decisions to withhold, with their reasons. | `/notices` |
| Record that basic trust information was given (to one beneficiary, or every beneficiary when no --to), or that beneficiaries were told of a trustee appointment or retirement (Trusts Act 2019 s 51). | `/notify` |
| Every dated obligation on every trust, or one trust, with the rule that sets it. Open and overdue by default; --all includes the done ones. | `/obligations` |
| Record money paid out on a distribution, and to whom if it was not the beneficiary. | `/paid` |
| List everyone who holds a role in any trust, with their current roles. | `/people` |
| One person: every role they hold or held, every distribution to them, and their information requests. | `/person` |
| The register of people: every current trustee, settlor, appointor, protector and beneficiary (--all includes past roles), for one trust or all. | `/register` |
| Record a repayment on a loan. Never more than the balance. | `/repay` |
| Log a beneficiary's request for trust information. Starts the clock (Trusts Act 2019 s 52: a reasonable period; the house rule sets the days). | `/request` |
| Beneficiaries' requests for trust information, with the day each is due (--open for the unanswered ones). | `/requests` |
| One resolution: who signed, and the distributions it made. | `/resolution` |
| List trustee resolutions, newest first, with how many trustees signed and who has not. | `/resolutions` |
| Record a trustee resolution and who signed it. Only a trustee in office that day can sign; it warns until every trustee has signed, unless the deed allows a majority. | `/resolve` |
| End a role on a date. A retiring trustee needs the documents handed over (Trusts Act 2019 s 48), the deed of retirement filed and the beneficiaries told. | `/retire` |
| Change a house rule. | `/set` |
| The house rules: review interval, notice and request days, accounts deadline, vesting warning, quiet days. | `/settings` |
| Record a trustee's signature on a resolution after the event. | `/sign` |
| Australia: record that a beneficiary has quoted a TFN to the trustee. The number itself is never stored here. | `/tfn-quoted` |
| One trust in full: details, people, open obligations, assets, loans and recent resolutions. | `/trust` |
| List the trusts, active by default (--all includes wound-up ones), optionally for one family. | `/trusts` |
| Australia: record that a company beneficiary's unpaid entitlement is on a complying loan agreement (Division 7A). | `/upe-loan` |
| Record a new value for an asset, and where it came from. | `/value` |
| Render the read-only dashboards in views.json (this week, year end, register of people, property and loans) to views/ in your brand. | `/view` |
| Write the Monday review to drafts/: what needs a person, the year end for every trust, and beneficiary requests waiting. | `/weekly-review` |
| Wind up a trust on a date. Refuses while it still holds assets or has open loans, unless --force. Ends every role and keeps every record. | `/wind-up` |
| Record a decision to withhold basic trust information from a beneficiary, with the section 53 factors the trustees weighed. | `/withhold` |
| Year end for every trust that distributes: the resolution, the distributions and the accounts for the last finished year (or --year). | `/year-end` |

If an ask fits nothing here, run the CLI directly (`npm run trusts -- --help`) and then propose a new command for it.

## Where things live

- `scripts/trusts.mjs` the CLI; `scripts/lib/domain.mjs` the rules. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL, with the views `v_trusts`, `v_register`, `v_loans`, `v_resolutions` and `v_obligations`. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/compliance.md` every rule and its source. `docs/replace-cch-trust-manager.md` moving across. `docs/cli.md` every command.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/cch-trust-manager
