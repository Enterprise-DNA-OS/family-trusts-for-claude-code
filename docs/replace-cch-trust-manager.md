# Moving from CCH Trust Manager

Bring your trusts and the people register across in an afternoon. Do a dry run first: it counts what would come across and keeps nothing.

## 1. Export the registers

From your trust software, export two lists to Excel and save each as CSV (comma-separated):

- **Trusts:** Trust Code, Trust Name, Client Group, Country, Date of Settlement, Vesting Date, Balance Date, IRD Number (or ABN), Trust Type, Deed Location.
- **People:** Trust Code (or Trust Name), Name (or First Name and Last Name), Role, Date Appointed, Date Resigned, Date of Birth, Email. One row per person per role: someone who is a trustee and a beneficiary is two rows.

We could not check CCH Trust Manager's own export columns against a live account, so the import reads the usual register headings and their common alternatives (`Settlement Date`, `Date Established`, `Relationship`, `Ceased`, `Surname` and so on). Where your headings differ, `--map` covers them. `examples/trust-manager/` has a small example of each file. Dates can be `YYYY-MM-DD` or day first (`21/10/2026`).

## 2. Import, dry run first

```bash
node scripts/trusts.mjs import trust-manager trusts.csv --kind=trusts --actor="Your name" --dry-run
node scripts/trusts.mjs import trust-manager trusts.csv --kind=trusts --actor="Your name"
node scripts/trusts.mjs import trust-manager people.csv --kind=people --actor="Your name" --dry-run
node scripts/trusts.mjs import trust-manager people.csv --kind=people --actor="Your name"
```

Trusts first, then people: each person row finds its trust by code or name. One bad row stops the whole file and nothing is kept, so fix the row (or map the column) and run it again. Running a file twice adds nothing the second time.

If a column has a different heading, map it in a small JSON file:

```json
{ "established": "Deed Date", "role": "Capacity Held" }
```

```bash
node scripts/trusts.mjs import trust-manager people.csv --kind=people --map=map.json --actor="Your name" --dry-run
```

The fields you can map: for trusts `code`, `name`, `family`, `jurisdiction`, `established`, `vesting`, `balance`, `tax`, `kind`, `held`; for people `trust`, `name`, `first`, `last`, `role`, `from`, `to`, `dob`, `email`, `kind`.

## 3. What maps

| From the export | Lands in |
|---|---|
| Client Group (or the trust name, when there is none) | `families`: one per group |
| Trust Name, code, dates, tax number, deed location | `trusts`. No vesting date in a New Zealand trust means 125 years from settlement (Trusts Act 2019 s 16) |
| Country (anything Australian, or a state) | `jurisdiction` AU, balance date 30 June unless the export says otherwise; everything else NZ, 31 March |
| Name | `people`, once per name. "Ltd", "Limited" or "Pty" makes it a company |
| Role | `roles`: anything with "trustee" is a trustee, "settlor" a settlor, "appoint" an appointor, "protector" or "guardian" a protector, "default" a default beneficiary, "benef" a beneficiary |
| Date Appointed, Date Resigned | `from_on`, `to_on`. A trustee who has already left comes across with the documents treated as handed over: the old system held that step |

## 4. What does not carry over

- **Documents.** The files stay where they are. Record each core document with `/add-document` (it notes where the original is held), and which trustee holds a copy with `/copy-held`. Claude Code can do this from a folder listing: ask it.
- **Resolutions, distributions and minutes.** Bring the last two or three years across with `/resolve` and `/distribute`, or ask Claude Code to read last year's resolutions and enter them for you to check.
- **Assets and loans.** Enter them from the latest financial statements with `/add-asset` and `/lend`; record the gifting history with `/forgive`.
- **Notices to beneficiaries.** Record the basic trust information already given with `/notify`, so the section 51 clocks start from the right day.
- **Templates and precedents.** The drafts here (resolution, minutes, beneficiary letter, request reply, summary) are plain text you can change. Put your own wording in through `/customise`.

## 5. Check it

```bash
node scripts/trusts.mjs trusts
node scripts/trusts.mjs register
node scripts/trusts.mjs attention
```

Expect `/attention` to fill up on the first day: missing deeds, trustee changes never notified, beneficiaries never told. That is the point. Work through it, or ask Enterprise DNA to bring the history across for you.
