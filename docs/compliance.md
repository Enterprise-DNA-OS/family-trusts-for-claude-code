# Rules and sources

Each rule the system checks, where it comes from, what a breach looks like in the records, and where the check lives. `/compliance` rolls up the dated ones; `/attention` puts every breach first. These are records checks, not legal or tax advice. Check them against the current legislation, the trust deed and your own advice before you rely on them, and when one changes, change the view and this page together.

`basis` on every obligation says who set the date: **law** (a statute), **deed** (the trust deed), or **house** (your practice's rule, in `settings`, changed with `/set`). Income years are named for the calendar year they end in. A deadline "within N days" means by the end of day N.

## Year end

| Rule | Source | Breach | Check |
|---|---|---|---|
| New Zealand: income is beneficiary income only if it vests in or is paid to a beneficiary in the income year, or by the later of 6 months after balance date and the earlier of the filing date and the due date for the return. The system uses 6 months, the earliest the window can close. Otherwise it is taxed as trustee income. | Income Tax Act 2007 s HC 6(1B); Inland Revenue, "Beneficiary income" | A distributing NZ trust with no distribution resolution for a finished year 6 months after balance date | `v_obligations` item `beneficiary income allocated` |
| Australia: the trustee resolves who is presently entitled to the trust's income by 30 June, or by the earlier date the deed sets. With no beneficiary presently entitled, the trustee is assessed on the net income, at the top rate under s 99A. | Income Tax Assessment Act 1936 ss 97 and 99A; ATO, "Trustee resolutions" | No distribution resolution for the year by 30 June (basis law) or by `trusts.resolve_by` (basis deed) | `distribution resolution` |
| Australia: a beneficiary is specifically entitled to a capital gain only if that is recorded in writing within 2 months after year end. | ITAA 1997 s 115-230 | A resolution streaming a capital gain made after 31 August | `capital gain recorded` |
| Australia: a beneficiary is specifically entitled to a franked distribution only if that is recorded in writing by year end. | ITAA 1997 s 207-58 | A resolution streaming a franked distribution made after 30 June | `franked distribution recorded` |
| The year's financial statements on file. New Zealand trustees keep accounting records and financial statements (s 45(f)). The timing is the practice's. | Trusts Act 2019 s 45(f); house rule `accounts_months` (9) | No `financial-statements` document for the year by the house deadline | `financial statements` |

## Trustees acting together

| Rule | Source | Breach | Check |
|---|---|---|---|
| If there is more than one trustee, the trustees must act unanimously, unless the deed says otherwise. | Trusts Act 2019 s 38 (a default duty the deed can modify); for Australia, the deed and the general law | A resolution not signed by every trustee in office that day, where `trusts.majority_allowed` is false (or fewer than a majority where it is true) | `v_resolutions`; `/attention` "not signed by every trustee" |
| A sole trustee who is also the sole beneficiary holds the legal and the beneficial interest together. They merge, and the trust can fail. | General law of trusts | An active trust whose one current trustee is its one current beneficiary | `/attention` "sole trustee is the sole beneficiary" |

## Core documents

| Rule | Source | Breach | Check |
|---|---|---|---|
| Each trustee keeps, so far as is reasonable: the deed and variations, records of trust property, records of trustee decisions, written contracts, accounting records and financial statements, documents of appointment, removal and discharge of trustees, any memorandum of wishes, and other documents needed to administer the trust. | Trusts Act 2019 s 45 | No deed on file; a trustee appointed after the trust began with no deed of appointment on file | `/core-documents`; `/attention` "no trust deed on file", "no appointment record" |
| With more than one trustee, every trustee holds the deed and the variations (or copies), and is satisfied that at least one trustee holds the rest. | Trusts Act 2019 s 46 | A current NZ trustee who holds no copy of a deed or variation on file (`document_copies`) | `/attention` "no copy of the deed" |
| Documents are kept for the duration of the trusteeship. | Trusts Act 2019 s 47 | Not a breach check: records are never deleted here | triggers `*_kept` |
| When a trusteeship ends and the trust continues, the trustee gives the documents they hold to at least one replacement or continuing trustee. | Trusts Act 2019 s 48 | A retired NZ trustee with no `docs_passed_on`, or one after the day the trusteeship ended | `documents passed on` |

## Information for beneficiaries

| Rule | Source | Breach | Check |
|---|---|---|---|
| There is a presumption that every beneficiary is given basic trust information: that they are a beneficiary, the name and contact details of the trustee, each appointment, removal and retirement of a trustee as it occurs, and their right to ask for the terms of the trust or trust information. Before giving it, the trustee considers the section 53 factors and may withhold it. | Trusts Act 2019 ss 51(1) to (3) and 53 | A beneficiary with no `basic-info` notice and no recorded decision to withhold | `/insights` question 7 |
| The trustee considers at reasonable intervals whether to make the basic trust information available. | Trusts Act 2019 s 51(4); house rule `info_review_months` (12) | No `basic-info` or `withheld` decision on the trust within the interval | `basic information considered` |
| Each appointment, removal and retirement of a trustee is notified as it occurs. | Trusts Act 2019 s 51(3)(c); house rule `notice_days` (30) | A trustee change since 30 January 2021 (when the Act came into force) with no `trustee-change` notice within the days | `trustee appointment notified`, `trustee retirement notified` |
| There is a presumption that a trustee gives a beneficiary the trust information they ask for within a reasonable period, after considering the section 53 factors. A decision to refuse needs those factors weighed. | Trusts Act 2019 ss 52 and 53; house rule `request_days` (20) | A request unanswered past the house days; a refusal or part answer with no reason (the database refuses one) | `information request answered` |

## Distributions

| Rule | Source | Breach | Check |
|---|---|---|---|
| New Zealand minor beneficiary rule: beneficiary income over $1,000 in a year derived by a beneficiary under 16 is taxed at the trustee rate. | Income Tax Act 2007 s HC 35 | An income distribution for the last finished year totalling over $1,000 to a beneficiary under 16 at balance date. `/distribute` warns at entry | `/attention` "minor beneficiary income" |
| Australia: a trust with a family trust election that distributes outside its family group pays family trust distribution tax on the amount. | ITAA 1936 Schedule 2F s 271-15 | A distribution in or after the election year to a beneficiary whose role has `in_family_group` false. `/distribute` warns at entry | `/attention` "outside the family group" |
| Australia: an unpaid present entitlement to a company beneficiary arising from 1 July 2022 can be treated as a loan for Division 7A unless paid or put on a complying loan agreement by the company's lodgment day. | ITAA 1936 Div 7A; ATO TD 2022/11 | A company beneficiary's entitlement for a finished year not fully paid and not marked `upe_loan` | `/attention` "unpaid entitlement to a company" |
| Australia: where a beneficiary's entitlement is paid to or used for someone else under an arrangement, s 100A can disregard the entitlement and assess the trustee. | ITAA 1936 s 100A; ATO TR 2022/4 and PCG 2022/2 | A distribution in the last two years with `paid_to` set to someone other than the beneficiary. Flagged for review, not judged | `/attention` "paid to someone else" |
| Australia: a beneficiary of a closely held trust quotes their TFN to the trustee before becoming entitled or being paid; without it the trustee withholds at the top rate. From 1 July 2026 the TFN is reported in the trust's return, not quarterly. | ATO, "TFN withholding for closely held trusts" | A distribution in the last two years to a beneficiary with `tfn_quoted` false. The number itself is never stored | `/attention` "no TFN quoted" |

## The life of the trust

| Rule | Source | Breach | Check |
|---|---|---|---|
| New Zealand: the maximum duration of a trust is 125 years. A trust with no vesting day or mechanism in its terms continues 125 years from creation. | Trusts Act 2019 s 16 | Not a breach: the vesting day (the deed's, or 125 years) is flagged `vesting_warn_days` (730) ahead | `trust vests` |
| The vesting day in the deed. Australian deeds name one, under the state perpetuity rule. | The trust deed | As above | `trust vests` (basis deed) |
| Trustees review the trust each year: the terms (s 23, duty to know the terms of the trust), the powers (s 32, duty to consider the exercise of power), the property and the beneficiaries. | Trusts Act 2019 ss 23 and 32; house rule `review_months` (12) | No `annual-review` resolution within the interval | `annual review` |

## What the system does not check

- Whether a distribution is within the deed's powers, or to someone the deed names. It checks the person is in the register as a beneficiary on the day; it does not read the deed.
- Gifting and means testing (for example a residential care subsidy assessment). Forgiving a loan needs a resolution; the effect on the settlor is a matter for their adviser.
- New Zealand's domestic trust disclosure in the IR6 (Tax Administration Act 1994 ss 59BA and 59BAB), which applied for the 2021-22 to 2025-26 income years and was repealed from 2026-27. Keep settlement and distribution records anyway: they are here.
- Trustee tax rates, tax returns and filing dates. Those sit with the tax return, not the trust register.
- Public holidays, and any deed-specific notice periods. Add them with `/customise` if you need them.
