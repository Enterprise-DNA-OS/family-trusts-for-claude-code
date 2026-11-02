# CLI reference

Every command is `node scripts/trusts.mjs <command> [arguments] [--options]`. Human tables by default, `--json` for machines. Every write needs `--actor="<your name>"`. Dates are `YYYY-MM-DD`. Amounts are dollars and cents (`1450.00`). Income years are named for the calendar year they end in: New Zealand 2026 is 1 April 2025 to 31 March 2026, Australia 2026 is 1 July 2025 to 30 June 2026.

## actions

`node scripts/trusts.mjs actions [--all]`

Follow-up actions, open by default (--all includes closed ones).

## activity

`node scripts/trusts.mjs activity [--days=<n>]`

What changed recently and who changed it, from the append-only log.

## add-action

`node scripts/trusts.mjs add-action [<trust>] --what="<what>" --due=<YYYY-MM-DD> [--owner=<name>] --actor="<your name>"`

Add a follow-up action with an owner and a due date, optionally against a trust.

## add-asset

`node scripts/trusts.mjs add-asset <trust> --description="<what>" --kind=property|shares|cash|loan-receivable|business|vehicle|other [--acquired=<YYYY-MM-DD>] [--cost=<amount>] [--value=<amount>] [--valued=<YYYY-MM-DD>] --actor="<your name>"`

Add an asset the trust holds.

## add-document

`node scripts/trusts.mjs add-document <trust> --kind=<kind> --title="<title>" [--dated=<YYYY-MM-DD>] [--year=<YYYY>] [--person=<person>] [--held-at="<where>"] --actor="<your name>"`

File a document against a trust: deed, variation, financial statements, minutes, appointment, retirement, memorandum of wishes, contract, valuation, loan agreement, election.

## add-family

`node scripts/trusts.mjs add-family <CODE> --name="<name>" [--partner=<name>] [--manager=<name>] [--email=<email>] --actor="<your name>"`

Add a client family (the household or group whose trusts you look after).

## add-person

`node scripts/trusts.mjs add-person <CODE> --name="<name>" [--kind=individual|company|trust|charity] [--dob=<YYYY-MM-DD>] [--email=<email>] [--phone=<phone>] [--address=<address>] [--tfn] --actor="<your name>"`

Add a person, company, trust or charity that holds a role. Records whether an Australian beneficiary has quoted a TFN, never the number.

## add-trust

`node scripts/trusts.mjs add-trust <CODE> --name="<name>" --family=<family> --jurisdiction=NZ|AU --established=<YYYY-MM-DD> [--vesting=<YYYY-MM-DD>] [--balance-month=<1-12>] [--resolve-by=<MM-DD>] [--fte=<YYYY-MM-DD>] [--majority] [--accumulates] [--tax-ref=<number>] [--held-at=<where the deed is>] --actor="<your name>"`

Add a trust: family, jurisdiction, establishment date, vesting day, balance month, and for Australia the deed's resolution date and any family trust election.

## answer

`node scripts/trusts.mjs answer <request> --outcome=given|part|refused [--reason="<s 53 factors>"] [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record the answer to a request: given, part or refused. A part answer or refusal needs the reasons.

## appoint

`node scripts/trusts.mjs appoint <trust> <person> --role=trustee|settlor|appointor|protector|beneficiary|default-beneficiary [--from=<YYYY-MM-DD>] [--outside-family] --actor="<your name>"`

Give a person a role in a trust from a date. A new trustee comes with the next steps: the deed of appointment, a copy of the deed, and (New Zealand) the beneficiaries told.

## assets

`node scripts/trusts.mjs assets [<trust>] [--all]`

The trust property: what each trust holds, cost, value and when it was valued (--all includes disposals).

## attention

`node scripts/trusts.mjs attention`

Show what needs a person today: legal and deed deadlines overdue or due soon (beneficiary income allocated, the 30 June resolution, trustee changes notified, requests answered, documents passed on, basic information considered, vesting), resolutions not signed by every trustee, a sole trustee who is the sole beneficiary, missing core documents and deed copies, minor beneficiary income, family trust election breaches, unpaid entitlements to companies, payments to someone else, missing TFNs, house rules, overdue actions, stale valuations and quiet trusts.

## close-action

`node scripts/trusts.mjs close-action <action> [--outcome="<what happened>"] --actor="<your name>"`

Close an action with its outcome.

## compliance

`node scripts/trusts.mjs compliance`

Every dated obligation rolled up by rule: how many are overdue, due soon, done late and done, with the source. Then run each check in docs/compliance.md.

## copy-held

`node scripts/trusts.mjs copy-held <document> --by=<trustee> [--since=<YYYY-MM-DD>] --actor="<your name>"`

Record that a trustee holds a copy of the deed or a variation (Trusts Act 2019 s 46).

## core-documents

`node scripts/trusts.mjs core-documents [<trust>]`

The core documents a trustee keeps (Trusts Act 2019 s 45), trust by trust: deed, variations, last year's accounts, decisions, appointment records, memorandum of wishes, asset records.

## dispose

`node scripts/trusts.mjs dispose <asset> --on=<YYYY-MM-DD> [--proceeds=<amount>] --actor="<your name>"`

Record that the trust sold or gave away an asset.

## distribute

`node scripts/trusts.mjs distribute <resolution> <beneficiary> (--amount=<amount> | --share=<percent>) [--kind=income|capital|franked|capital-gain] --actor="<your name>"`

Record a beneficiary's share under a distribution resolution, as an amount or a percentage. Warns on a New Zealand beneficiary under 16 over $1,000, an Australian beneficiary outside the family group, and a missing TFN.

## distributions

`node scripts/trusts.mjs distributions [<trust>] [--year=<YYYY>] [--unpaid]`

List distributions by trust and year (--unpaid for entitlements not yet paid).

## docs-passed

`node scripts/trusts.mjs docs-passed <trust> <person> [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record the day a retired trustee handed the trust documents to a continuing trustee (Trusts Act 2019 s 48).

## documents

`node scripts/trusts.mjs documents [<trust>] [--kind=<kind>]`

List the documents on file for a trust, where each is held, and which trustees hold a copy.

## draft-beneficiary-notice

`node scripts/trusts.mjs draft-beneficiary-notice <trust> [<beneficiary>]`

Draft the basic trust information letter (Trusts Act 2019 s 51(3)): that they are a beneficiary, the trustees and how to reach them, any trustee changes, and their right to ask. New Zealand trusts.

## draft-minutes

`node scripts/trusts.mjs draft-minutes <trust>`

Draft the minutes of the annual trustee review: deed, people, property, loans and the matters to decide, to drafts/.

## draft-request-reply

`node scripts/trusts.mjs draft-request-reply <request> [--outcome=given|part|refused]`

Draft the reply to a beneficiary's information request: given, part or refused.

## draft-resolution

`node scripts/trusts.mjs draft-resolution <trust> [--year=<YYYY>]`

Draft the year-end distribution resolution for a trust, with every current beneficiary listed, last year's figures for reference and the signing block, to drafts/.

## draft-summary

`node scripts/trusts.mjs draft-summary <trust>`

Draft a one-page trust summary for the client meeting: people, property, loans, four years of distributions and open items.

## export

`node scripts/trusts.mjs export [--out=<file.json>]`

Write every table to one JSON file you can keep or move anywhere.

## families

`node scripts/trusts.mjs families`

List the client families with their partner, manager, active trusts and overdue obligations.

## family

`node scripts/trusts.mjs family <family>`

One client family: its trusts and everything overdue or due soon across them.

## forgive

`node scripts/trusts.mjs forgive <loan> --amount=<amount> --resolution=<resolution> [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record a forgiveness (a gift) on a loan the trust owes. Needs the resolution or deed that records the gift.

## import

`node scripts/trusts.mjs import trust-manager <file.csv> --kind=trusts|people --dry-run --actor="<your name>"`

Bring trusts and people across from a trust register export (comma-separated). Dry run first. Import trusts, then people.

## insights

`node scripts/trusts.mjs insights`

Answer the ten questions the practice software cannot: holdings by family, settlor loans and gifting, who received what, missed deadlines by manager, resolution timing, trustees of several trusts, beneficiaries never told, minors' allocations, stale valuations and trusts vesting.

## lend

`node scripts/trusts.mjs lend <trust> <person> --amount=<amount> [--on=<YYYY-MM-DD>] [--terms="<terms>"] [--owed-to-trust] --actor="<your name>"`

Open a loan: a settlor or family member lends the trust money (or with --owed-to-trust, the trust lends out), with its first advance.

## loans

`node scripts/trusts.mjs loans [<trust>]`

Loans to and from each trust: advanced, repaid, forgiven and the balance.

## note

`node scripts/trusts.mjs note <trust> --text="<what happened>" [--kind=call|email|meeting|letter|note] --actor="<your name>"`

Add a note to a trust: a call, email, meeting or letter.

## notices

`node scripts/trusts.mjs notices [<trust>]`

Basic trust information given, trustee changes notified, and decisions to withhold, with their reasons.

## notify

`node scripts/trusts.mjs notify <trust> --kind=basic-info|trustee-change [--to=<beneficiary>] [--trustee=<trustee>] [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record that basic trust information was given (to one beneficiary, or every beneficiary when no --to), or that beneficiaries were told of a trustee appointment or retirement (Trusts Act 2019 s 51).

## obligations

`node scripts/trusts.mjs obligations [<trust>] [--all]`

Every dated obligation on every trust, or one trust, with the rule that sets it. Open and overdue by default; --all includes the done ones.

## paid

`node scripts/trusts.mjs paid <distribution> --amount=<amount> [--on=<YYYY-MM-DD>] [--to="<who received it>"] --actor="<your name>"`

Record money paid out on a distribution, and to whom if it was not the beneficiary.

## people

`node scripts/trusts.mjs people`

List everyone who holds a role in any trust, with their current roles.

## person

`node scripts/trusts.mjs person <person>`

One person: every role they hold or held, every distribution to them, and their information requests.

## register

`node scripts/trusts.mjs register [<trust>] [--all]`

The register of people: every current trustee, settlor, appointor, protector and beneficiary (--all includes past roles), for one trust or all.

## repay

`node scripts/trusts.mjs repay <loan> --amount=<amount> [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record a repayment on a loan. Never more than the balance.

## request

`node scripts/trusts.mjs request <trust> <beneficiary> --what="<what they asked for>" [--received=<YYYY-MM-DD>] --actor="<your name>"`

Log a beneficiary's request for trust information. Starts the clock (Trusts Act 2019 s 52: a reasonable period; the house rule sets the days).

## requests

`node scripts/trusts.mjs requests [--open]`

Beneficiaries' requests for trust information, with the day each is due (--open for the unanswered ones).

## resolution

`node scripts/trusts.mjs resolution <ref>`

One resolution: who signed, and the distributions it made.

## resolutions

`node scripts/trusts.mjs resolutions [<trust>] [--year=<YYYY>]`

List trustee resolutions, newest first, with how many trustees signed and who has not.

## resolve

`node scripts/trusts.mjs resolve <trust> --kind=distribution|annual-review|appointment|retirement|investment|loan|gift|information|general --summary="<what was decided>" [--year=<YYYY>] [--on=<YYYY-MM-DD>] [--signed="<name>, <name>"] --actor="<your name>"`

Record a trustee resolution and who signed it. Only a trustee in office that day can sign; it warns until every trustee has signed, unless the deed allows a majority.

## retire

`node scripts/trusts.mjs retire <trust> <person> --role=<role> [--to=<YYYY-MM-DD>] [--docs-passed=<YYYY-MM-DD>] --actor="<your name>"`

End a role on a date. A retiring trustee needs the documents handed over (Trusts Act 2019 s 48), the deed of retirement filed and the beneficiaries told.

## set

`node scripts/trusts.mjs set <key> <value> [--note="<why>"] --actor="<your name>"`

Change a house rule.

## settings

`node scripts/trusts.mjs settings`

The house rules: review interval, notice and request days, accounts deadline, vesting warning, quiet days.

## sign

`node scripts/trusts.mjs sign <resolution> --by=<trustee> [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record a trustee's signature on a resolution after the event.

## tfn-quoted

`node scripts/trusts.mjs tfn-quoted <person> --actor="<your name>"`

Australia: record that a beneficiary has quoted a TFN to the trustee. The number itself is never stored here.

## trust

`node scripts/trusts.mjs trust <trust>`

One trust in full: details, people, open obligations, assets, loans and recent resolutions.

## trusts

`node scripts/trusts.mjs trusts [--family=<family>] [--all]`

List the trusts, active by default (--all includes wound-up ones), optionally for one family.

## upe-loan

`node scripts/trusts.mjs upe-loan <distribution> --actor="<your name>"`

Australia: record that a company beneficiary's unpaid entitlement is on a complying loan agreement (Division 7A).

## value

`node scripts/trusts.mjs value <asset> --value=<amount> [--on=<YYYY-MM-DD>] [--note="<registered valuation, broker statement>"] --actor="<your name>"`

Record a new value for an asset, and where it came from.

## weekly-review

`node scripts/trusts.mjs weekly-review`

Write the Monday review to drafts/: what needs a person, the year end for every trust, and beneficiary requests waiting.

## wind-up

`node scripts/trusts.mjs wind-up <trust> --on=<YYYY-MM-DD> [--force] --actor="<your name>"`

Wind up a trust on a date. Refuses while it still holds assets or has open loans, unless --force. Ends every role and keeps every record.

## withhold

`node scripts/trusts.mjs withhold <trust> <beneficiary> --reason="<the s 53 factors weighed>" [--on=<YYYY-MM-DD>] --actor="<your name>"`

Record a decision to withhold basic trust information from a beneficiary, with the section 53 factors the trustees weighed.

## year-end

`node scripts/trusts.mjs year-end [--year=<YYYY>]`

Year end for every trust that distributes: the resolution, the distributions and the accounts for the last finished year (or --year).

## view and docs

`npm run view` renders the dashboards in `views.json`; `npm run docs` renders the paperwork in `documents.json`. Both read only.
