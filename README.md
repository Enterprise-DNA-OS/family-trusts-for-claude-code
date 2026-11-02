<h1 align="center">Family Trusts for Claude Code</h1>

<p align="center">
  <strong>The open-source family trust administration system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your CCH Trust Manager data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cch-trust-manager">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/cch-trust-manager?utm_source=github&utm_medium=readme&utm_campaign=cch-trust-manager">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-cch-trust-manager">Instead of CCH Trust Manager</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Family Trusts for Claude Code does the job you pay CCH Trust Manager for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the CCH Trust Manager dashboard cannot.

Wolters Kluwer publishes no price for CCH Entities Trust Manager: its listing on the Actionstep integrations marketplace says "Price on application" ([actionstep.com](https://www.actionstep.com/?p=6713), checked 2 November 2026). Here the database is yours, and another trust, trustee or staff member costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cch-trust-manager).

It is for the accounting or law practice, or trustee company, that administers family trusts in New Zealand or Australia. It keeps the people register (trustees, settlors, appointors, protectors and beneficiaries, current and past), the trust property, settlor loans and the gifting programme, every trustee resolution and who signed it, distributions, the core documents and which trustee holds a copy, and what each beneficiary has been told or has asked for.

Then it checks the records against the rules trusts live under: beneficiary income vested or paid within 6 months of balance date (Income Tax Act 2007 s HC 6) or resolved by 30 June in Australia (ITAA 1936 ss 97 and 99A), every trustee signing (Trusts Act 2019 s 38), trustee changes notified to beneficiaries (s 51(3)(c)), requests answered (s 52), documents handed over when a trustee retires (s 48), the minor beneficiary rule (HC 35), family trust distribution tax, unpaid entitlements to a company, and the vesting day.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/family-trusts-for-claude-code.git
cd family-trusts-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/trust Walker Family`, `/year-end` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Statute and deed deadlines overdue or due soon, then unsigned resolutions, a sole trustee who is the sole beneficiary, missing documents and deed copies, minor beneficiary income, family trust election breaches, unpaid company entitlements, payments to someone else, missing TFNs, house rules, overdue actions and stale valuations |
| `/year-end` | Every trust's last finished year: resolution, distributions, accounts |
| `/obligations` and `/compliance` | Every dated obligation and how it was met, with its source |
| `/trust` and `/register` | One trust in full, and the register of people |
| `/appoint` and `/retire` | A role from a date, and its end. A new trustee comes with the appointment deed, the deed copy and the notice to beneficiaries as next steps; the last trustee cannot retire |
| `/resolve` and `/sign` | A trustee resolution and who signed. Only a trustee in office that day signs; it warns until every trustee has |
| `/distribute` and `/paid` | A beneficiary's amount or share under a resolution, and the money paid. Refuses someone who was not a beneficiary that day, and shares over 100% |
| `/lend`, `/repay` and `/forgive` | Settlor loans and the gifting programme. A forgiveness needs the resolution that records the gift |
| `/notify`, `/withhold`, `/request` and `/answer` | Basic trust information given or withheld (with the section 53 factors), and beneficiaries' requests on the clock |
| `/core-documents` | The section 45 documents, trust by trust: what is on file and what is missing |
| `/draft-resolution` | The year-end distribution resolution with every beneficiary and the signing block, to `drafts/` |
| `/draft-minutes` | The annual review minutes, to `drafts/` |
| `/draft-beneficiary-notice` | The basic trust information letter with any trustee changes, to `drafts/` |
| `/draft-request-reply` and `/draft-summary` | The reply to a request, and a one-page trust summary for the client meeting |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/insights` | The ten questions below |

The working commands: `/add-family`, `/add-trust`, `/add-person`, `/docs-passed`, `/add-asset`, `/value`, `/dispose`, `/upe-loan`, `/add-document`, `/copy-held`, `/tfn-quoted`, `/wind-up`, `/add-action`, `/close-action`, `/note`, `/set`. The reads: `/families`, `/family`, `/trusts`, `/people`, `/person`, `/assets`, `/loans`, `/resolutions`, `/resolution`, `/distributions`, `/documents`, `/notices`, `/requests`, `/actions`, `/activity`, `/settings`. Plus `/import`, `/export`, `/view`, `/docs`, `/new-view` and `/customise`. 65 commands in all; [docs/cli.md](docs/cli.md) lists every one.

Names match case-insensitively. A trust can be found by its code or name, a person by code or name. A partial name works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- **Year end.** A New Zealand trust's income must vest in or be paid to a beneficiary within 6 months of balance date to be beneficiary income (Income Tax Act 2007 s HC 6(1B)). An Australian trust resolves by 30 June, or the deed's earlier date, or the trustee is assessed (ITAA 1936 ss 97 and 99A); capital gains streamed are recorded within 2 months (ITAA 1997 s 115-230) and franked distributions by year end (s 207-58). A resolution made late stays on the record as late.
- **Signatures.** `/resolve` and `/sign` accept only a trustee in office on the day. Until every trustee has signed (Trusts Act 2019 s 38), or a majority where the deed allows it, the resolution is flagged.
- **Trustee changes.** A New Zealand appointment or retirement starts the clock to tell the beneficiaries (s 51(3)(c)); a retirement starts the handover of documents (s 48). `/retire` refuses to remove the last trustee.
- **Information.** Basic trust information is considered at reasonable intervals (s 51(4)); a decision to withhold needs the section 53 factors written down; a beneficiary's request is answered within the house rule's days (s 52), and a refusal needs reasons.
- **Distributions.** `/distribute` refuses anyone who was not a beneficiary that day and shares over 100%, and warns on a New Zealand beneficiary under 16 over $1,000 (HC 35), an Australian beneficiary outside the family group of a trust with a family trust election (Sch 2F s 271-15), and one with no TFN quoted. `/attention` flags an unpaid entitlement to a company with no complying loan (Division 7A) and a distribution paid to someone else (s 100A).
- **Loans.** No repayment or forgiveness above the balance. A forgiveness of a loan the trust owes needs the resolution that records the gift.
- **Records.** Trusts, roles, resolutions, signatures, distributions, documents, notices and notes cannot be deleted, and the activity log cannot be rewritten. No tax file number or IRD number is stored for a person.

The software records and checks; the trustees decide. It is not legal or tax advice, and it sends nothing.

## Ten questions answered from your records

`/insights` runs all ten today.

1. What does each family hold in trust, and when was each trust last valued?
2. How much does each trust still owe its settlors, and how much was forgiven in the last five years?
3. Who has received the most from each family's trusts over the last four years?
4. Which legal and deed deadlines were missed or met late in the last three years, by manager?
5. How long after balance date does each trust make its distribution resolution?
6. Who is a trustee of more than one trust, and which?
7. Which beneficiaries have never been given basic trust information, and has anyone decided to withhold it?
8. Which beneficiaries are under 16, and what have they been allocated each year?
9. Which properties and businesses have not been valued in three years?
10. Which trusts vest in the next ten years, and what do they hold?

## Your first hour: ten things to ask for

1. "What needs doing this week?" (`/attention`)
2. "Where is every trust on last year's resolution and accounts?" (`/year-end`)
3. "Show me the Walker Family Trust." (`/trust`)
4. "Which trusts are missing a core document?" (`/core-documents`)
5. "Draft the distribution resolution for the Okafor Family Trust." (`/draft-resolution`)
6. "Tōtara Trustees has been appointed: what do I need to do?" (`/appoint`, then the next steps it lists)
7. "Draft the letter to Ella telling her she is a beneficiary." (`/draft-beneficiary-notice`)
8. "How much do the Walkers' trusts still owe them?" (`/loans`)
9. "Write my Monday review." (`/weekly-review`)
10. "Add a field for the trust's bank account, and show it on the summary." (`/customise`)

## Instead of CCH Trust Manager

Export the trust list and the people register to Excel, save each as CSV, and run a dry run:

```bash
node scripts/trusts.mjs import trust-manager trusts.csv --kind=trusts --actor="Your name" --dry-run
node scripts/trusts.mjs import trust-manager people.csv --kind=people --actor="Your name" --dry-run
```

It reads the common register headings (Trust Name, Date of Settlement, Vesting Date, Name, Role, Date Appointed, Date Resigned and their usual alternatives), maps roles like "Discretionary Beneficiary" and "Corporate Trustee", and stops the whole file on one bad row. Documents, resolutions and distributions come across by hand or with Claude Code's help. Step by step, and what does not carry over: [docs/replace-cch-trust-manager.md](docs/replace-cch-trust-manager.md).

## Architecture

```
family-trusts-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the rules and sources, the CLI, the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Family Trusts for Claude Code for your business, migrates your CCH Trust Manager data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=cch-trust-manager)
- Read more: [enterprisedna.co/omni/instead-of/cch-trust-manager](https://enterprisedna.co/omni/instead-of/cch-trust-manager?utm_source=github&utm_medium=readme&utm_campaign=cch-trust-manager)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
