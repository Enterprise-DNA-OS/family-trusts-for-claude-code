# Why there is no front end

CCH Trust Manager is a database with a subscription. The tables underneath it are ordinary: a few entities, a few relationships, a handful of workflows you repeat every week. What you pay for is the layer on top that lets people who do not write SQL get at those tables. Screens, filters, dashboards, forms.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, describe what you want, and it writes the query, runs it, and explains the answer. Ask a question the dashboard never had a chart for and you still get an answer.

## What you gain

- **Better answers.** A dashboard shows what the vendor decided to chart. Here you ask your own question, in your own words, and get it answered against your own data.
- **No seats.** Everyone who needs to look can look. The bill does not grow with headcount.
- **Your data in your Postgres.** Plain tables. Back them up, query them from anything, leave any time. There is no export step because there is nothing to leave.
- **A process that matches you.** When your way of working changes, you add a command. You do not wait for a feature request to clear.

## What you give up

- **A document store.** The records say where each deed, variation and set of accounts is held; the files themselves stay in your document system.
- **A portal for clients and beneficiaries.** Nobody outside the practice signs in. Letters and summaries are drafted for you to send.
- **A precedent library.** The drafts are short and plain. Your own precedents go in through `/customise`.
- **A phone app.** It runs where Claude Code runs.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version for practices that want someone to call.

## Who this fits

Practices that already use Claude Code, or who would rather learn to ask than learn another interface. If your team needs a screen to look at all day, keep CCH Trust Manager. If you need the answers (which trusts are past the six-month window, who was never told they are a beneficiary, which resolution one trustee never signed) more than the screens, this is cheaper, faster and yours.

Installed and run for you: https://enterprisedna.co/omni/instead-of/cch-trust-manager
