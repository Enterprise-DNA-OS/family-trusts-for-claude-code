-- Demo data: Tōtara Chartered Accountants, a fictional practice in Hamilton with a Brisbane office,
-- looking after seven trusts for four client families. Every name, trust and figure here is invented.
-- Dates are relative to today, so the attention list always has something to say: a corporate trustee
-- appointed with no notice to the beneficiaries and no copy of the deed, a 14-year-old paid more than
-- $1,000 of beneficiary income, a business trust with no distribution resolution for last year, a loan
-- resolution only one of two trustees signed, a beneficiary's information request past 20 days, a new
-- trust that has never considered giving basic trust information, a sole trustee who is now the sole
-- beneficiary, a trust that vests inside two years, an Australian company beneficiary with an unpaid
-- entitlement, a distribution outside the family group of a trust with a family trust election, an
-- adult beneficiary whose distribution was paid to her father, an annual review overdue, and a rental
-- property not valued in over three years.
-- Safe to run twice: every row has a natural key.

insert into settings (key, value, note) values
  ('review_months', '12', 'House rule: months between annual trustee reviews'),
  ('info_review_months', '12', 'House rule: months between decisions on basic trust information (Trusts Act 2019 s 51(4) says "reasonable intervals")'),
  ('notice_days', '30', 'House rule: days to tell beneficiaries of a trustee appointment or retirement (s 51(3)(c) says "as it occurs")'),
  ('request_days', '20', 'House rule: days to answer a beneficiary''s request for trust information (s 52 says "a reasonable period")'),
  ('accounts_months', '9', 'House rule: months after balance date to have the financial statements on file'),
  ('vesting_warn_days', '730', 'House rule: start planning this many days before a trust vests'),
  ('quiet_days', '150', 'House rule: an active trust with no note, resolution or activity for this many days is flagged'),
  ('revalue_years', '3', 'House rule: flag a property or business not valued in this many years')
on conflict (key) do nothing;

insert into families (code, name, partner, manager, email) values
  ('WALKER', 'Graham and Susan Walker', 'Aroha Ngata', 'Ben Fraser', 'graham.walker@example.co.nz'),
  ('CHEN', 'Wei and Lily Chen', 'Aroha Ngata', 'Priya Shah', 'wei.chen@example.co.nz'),
  ('HENARE', 'Mere Henare', 'Daniel Reid', 'Ben Fraser', 'mere.henare@example.co.nz'),
  ('OKAFOR', 'Chidi and Ngozi Okafor', 'Daniel Reid', 'Mia Russo', 'chidi.okafor@example.com.au')
on conflict (code) do nothing;

insert into trusts (code, name, family_id, jurisdiction, kind, established_on, vesting_on, balance_month, resolve_by, majority_allowed, distributes, family_trust_election_on, tax_ref, deed_held_at, status, wound_up_on, note)
select v.code, v.name, f.id, v.j, v.kind, v.est::date, v.vest::date, v.bm, v.rb, v.maj, v.dist, v.fte::date, v.tax, v.held, v.status, v.wound::date, v.note
from (values
  ('WFT', 'Walker Family Trust', 'WALKER', 'NZ', 'discretionary', '1998-05-14', '2078-05-13', 3, null, false, true, null, '061-224-718', 'Tōtara safe, Hamilton', 'active', null, 'Holds the family home and a share portfolio. Gifting programme on the settlors'' loans.'),
  ('WBT', 'Walker Business Trust', 'WALKER', 'NZ', 'discretionary', '2009-08-03', '2089-08-02', 3, null, false, true, null, '098-551-302', 'Tōtara safe, Hamilton', 'active', null, 'Owns Walker Contracting Ltd.'),
  ('KWT', 'Kōwhai Trust', 'CHEN', 'NZ', 'discretionary', '2021-03-15', null, 3, null, false, true, null, '131-087-554', 'Tōtara document vault', 'active', null, 'Set up under the Trusts Act 2019. Tauranga rental and a term deposit.'),
  ('CIT', 'Chen Investment Trust', 'CHEN', 'NZ', 'discretionary', '2006-02-01', '2086-01-31', 3, null, false, true, null, '091-334-120', 'Tōtara document vault', 'wound-up', '2024-03-28', 'Wound up after the Hamilton commercial property sold.'),
  ('HWT', 'Henare Whānau Trust', 'HENARE', 'NZ', 'discretionary', '2004-11-22', (current_date + 400)::text, 3, null, false, true, null, '088-412-905', 'Client holds the original', 'active', null, 'Holds the Raglan bach.'),
  ('OFT', 'Okafor Family Trust', 'OKAFOR', 'AU', 'discretionary', '2012-09-01', '2092-08-31', 6, null, false, true, '2013-06-30', '81 204 556 117', 'Brisbane office safe', 'active', null, 'Corporate trustee. Family trust election made for the 2013 year.'),
  ('BRT', 'Brisbane Rentals Trust', 'OKAFOR', 'AU', 'discretionary', '2019-07-15', '2099-07-14', 6, '06-28', false, true, null, '62 778 903 441', 'Brisbane office safe', 'active', null, 'Two rental units in Chermside. The deed wants resolutions by 28 June.')
) v(code, name, fam, j, kind, est, vest, bm, rb, maj, dist, fte, tax, held, status, wound, note)
join families f on f.code = v.fam
on conflict (code) do nothing;

insert into people (code, name, kind, dob, email, phone, address, tfn_quoted)
select v.code, v.name, v.kind, v.dob::date, v.email, v.phone, v.address, v.tfn
from (values
  ('P-GWALKER', 'Graham Walker', 'individual', '1958-02-11', 'graham.walker@example.co.nz', '021 555 0141', '18 Riverlea Road, Hamilton', false),
  ('P-SWALKER', 'Susan Walker', 'individual', '1960-09-30', 'susan.walker@example.co.nz', '021 555 0142', '18 Riverlea Road, Hamilton', false),
  ('P-EWALKER', 'Ella Walker', 'individual', '2000-04-18', 'ella.walker@example.co.nz', '022 555 0143', '4/12 Cuba Street, Wellington', false),
  ('P-TWALKER', 'Tom Walker', 'individual', (current_date - interval '14 years 3 months')::date::text, null, null, '18 Riverlea Road, Hamilton', false),
  ('P-IWALKER', 'Ian Walker', 'individual', '1955-06-02', 'ian.walker@example.co.nz', null, 'Cambridge', false),
  ('P-TOTARA', 'Tōtara Trustees Ltd', 'company', null, 'trustees@totara.example.co.nz', '07 555 0100', '220 Victoria Street, Hamilton', false),
  ('P-ANGATA', 'Aroha Ngata', 'individual', '1971-03-03', 'aroha@totara.example.co.nz', '07 555 0101', '220 Victoria Street, Hamilton', false),
  ('P-WCHEN', 'Wei Chen', 'individual', '1979-12-05', 'wei.chen@example.co.nz', '027 555 0151', '9 Sunbrook Rise, Tauranga', false),
  ('P-LCHEN', 'Lily Chen', 'individual', '1982-07-21', 'lily.chen@example.co.nz', '027 555 0152', '9 Sunbrook Rise, Tauranga', false),
  ('P-MCHEN', 'Max Chen', 'individual', (current_date - interval '16 years 2 months')::date::text, null, null, '9 Sunbrook Rise, Tauranga', false),
  ('P-RCHEN', 'Ruby Chen', 'individual', (current_date - interval '11 years 5 months')::date::text, null, null, '9 Sunbrook Rise, Tauranga', false),
  ('P-MHENARE', 'Mere Henare', 'individual', '1949-01-15', 'mere.henare@example.co.nz', '021 555 0161', 'Raglan', false),
  ('P-RHENARE', 'Rawiri Henare', 'individual', '1946-08-09', null, null, 'Raglan', false),
  ('P-COKAFOR', 'Chidi Okafor', 'individual', '1975-05-27', 'chidi.okafor@example.com.au', '0412 555 171', '14 Kedron Brook Road, Wilston QLD', true),
  ('P-NOKAFOR', 'Ngozi Okafor', 'individual', '1978-10-03', 'ngozi.okafor@example.com.au', '0412 555 172', '14 Kedron Brook Road, Wilston QLD', true),
  ('P-AOKAFOR', 'Ada Okafor', 'individual', (current_date - interval '22 years 1 month')::date::text, 'ada.okafor@example.com.au', '0412 555 173', 'St Lucia QLD', false),
  ('P-OHOLD', 'Okafor Holdings Pty Ltd', 'company', null, 'chidi.okafor@example.com.au', null, '14 Kedron Brook Road, Wilston QLD', true),
  ('P-OINV', 'Okafor Investments Pty Ltd', 'company', null, 'chidi.okafor@example.com.au', null, '14 Kedron Brook Road, Wilston QLD', true),
  ('P-JHOLT', 'James Holt', 'individual', '1980-02-14', 'james.holt@example.com.au', null, 'Paddington QLD', true)
) v(code, name, kind, dob, email, phone, address, tfn)
on conflict (code) do nothing;

insert into roles (trust_id, person_id, role, from_on, to_on, docs_passed_on, in_family_group, note)
select t.id, p.id, v.role, v.f::date, v.t::date, v.dp::date, v.fam, v.note
from (values
  ('WFT', 'P-GWALKER', 'trustee', '1998-05-14', null, null, true, null),
  ('WFT', 'P-SWALKER', 'trustee', '1998-05-14', null, null, true, null),
  ('WFT', 'P-IWALKER', 'trustee', '1998-05-14', '2022-06-30', '2022-06-30', true, 'Retired as trustee'),
  ('WFT', 'P-TOTARA', 'trustee', '2022-07-01', null, null, true, 'Independent corporate trustee in place of Ian Walker'),
  ('WFT', 'P-GWALKER', 'settlor', '1998-05-14', null, null, true, null),
  ('WFT', 'P-SWALKER', 'settlor', '1998-05-14', null, null, true, null),
  ('WFT', 'P-GWALKER', 'appointor', '1998-05-14', null, null, true, null),
  ('WFT', 'P-GWALKER', 'beneficiary', '1998-05-14', null, null, true, null),
  ('WFT', 'P-SWALKER', 'beneficiary', '1998-05-14', null, null, true, null),
  ('WFT', 'P-EWALKER', 'beneficiary', '2000-04-18', null, null, true, 'Child of the settlors'),
  ('WFT', 'P-TWALKER', 'beneficiary', (current_date - interval '14 years 3 months')::date::text, null, null, true, 'Child of the settlors'),
  ('WBT', 'P-GWALKER', 'trustee', '2009-08-03', null, null, true, null),
  ('WBT', 'P-ANGATA', 'trustee', '2009-08-03', null, null, true, 'Independent trustee'),
  ('WBT', 'P-GWALKER', 'settlor', '2009-08-03', null, null, true, null),
  ('WBT', 'P-GWALKER', 'appointor', '2009-08-03', null, null, true, null),
  ('WBT', 'P-GWALKER', 'beneficiary', '2009-08-03', null, null, true, null),
  ('WBT', 'P-SWALKER', 'beneficiary', '2009-08-03', null, null, true, null),
  ('WBT', 'P-EWALKER', 'beneficiary', '2009-08-03', null, null, true, null),
  ('WBT', 'P-TWALKER', 'beneficiary', (current_date - interval '14 years 3 months')::date::text, null, null, true, null),
  ('KWT', 'P-WCHEN', 'trustee', '2021-03-15', null, null, true, null),
  ('KWT', 'P-LCHEN', 'trustee', '2021-03-15', null, null, true, null),
  ('KWT', 'P-WCHEN', 'settlor', '2021-03-15', null, null, true, null),
  ('KWT', 'P-LCHEN', 'appointor', '2021-03-15', null, null, true, null),
  ('KWT', 'P-WCHEN', 'beneficiary', '2021-03-15', null, null, true, null),
  ('KWT', 'P-LCHEN', 'beneficiary', '2021-03-15', null, null, true, null),
  ('KWT', 'P-MCHEN', 'beneficiary', '2021-03-15', null, null, true, null),
  ('KWT', 'P-RCHEN', 'beneficiary', '2021-03-15', null, null, true, null),
  ('CIT', 'P-WCHEN', 'trustee', '2006-02-01', '2024-03-28', '2024-03-28', true, 'Trust wound up'),
  ('CIT', 'P-LCHEN', 'trustee', '2006-02-01', '2024-03-28', '2024-03-28', true, 'Trust wound up'),
  ('CIT', 'P-WCHEN', 'beneficiary', '2006-02-01', '2024-03-28', null, true, null),
  ('HWT', 'P-MHENARE', 'trustee', '2004-11-22', null, null, true, null),
  ('HWT', 'P-RHENARE', 'trustee', '2004-11-22', (current_date - 210)::text, (current_date - 200)::text, true, 'Retired on moving into care'),
  ('HWT', 'P-MHENARE', 'settlor', '2004-11-22', null, null, true, null),
  ('HWT', 'P-MHENARE', 'beneficiary', '2004-11-22', null, null, true, null),
  ('HWT', 'P-RHENARE', 'beneficiary', '2004-11-22', (current_date - 210)::text, null, true, 'Released his interest when he retired'),
  ('OFT', 'P-OHOLD', 'trustee', '2012-09-01', null, null, true, 'Corporate trustee: directors Chidi and Ngozi Okafor'),
  ('OFT', 'P-COKAFOR', 'appointor', '2012-09-01', null, null, true, null),
  ('OFT', 'P-COKAFOR', 'beneficiary', '2012-09-01', null, null, true, 'Primary beneficiary'),
  ('OFT', 'P-NOKAFOR', 'beneficiary', '2012-09-01', null, null, true, 'Primary beneficiary'),
  ('OFT', 'P-AOKAFOR', 'beneficiary', '2012-09-01', null, null, true, null),
  ('OFT', 'P-OINV', 'beneficiary', '2016-07-01', null, null, true, 'Bucket company'),
  ('OFT', 'P-COKAFOR', 'default-beneficiary', '2012-09-01', null, null, true, null),
  ('OFT', 'P-JHOLT', 'beneficiary', '2012-09-01', null, null, false, 'Ngozi''s brother-in-law: outside the family group'),
  ('BRT', 'P-COKAFOR', 'trustee', '2019-07-15', null, null, true, null),
  ('BRT', 'P-NOKAFOR', 'trustee', '2019-07-15', null, null, true, null),
  ('BRT', 'P-COKAFOR', 'beneficiary', '2019-07-15', null, null, true, null),
  ('BRT', 'P-NOKAFOR', 'beneficiary', '2019-07-15', null, null, true, null),
  ('BRT', 'P-AOKAFOR', 'beneficiary', '2019-07-15', null, null, true, null)
) v(trust, person, role, f, t, dp, fam, note)
join trusts t on t.code = v.trust join people p on p.code = v.person
where not exists (select 1 from roles r where r.trust_id = t.id and r.person_id = p.id and r.role = v.role and r.from_on = v.f::date);

insert into assets (ref, trust_id, description, kind, acquired_on, cost_cents, value_cents, valued_on, disposed_on, disposal_cents, note)
select v.ref, t.id, v.descr, v.kind, v.acq::date, v.cost, v.val, v.valued::date, v.disp::date, v.dispc, v.note
from (values
  ('AST-WFT-1', 'WFT', '18 Riverlea Road, Hamilton (family home)', 'property', '1998-05-20', 42000000, 118000000, (current_date - 300)::text, null, null, 'Registered valuation'),
  ('AST-WFT-2', 'WFT', 'Listed share portfolio (Craigs Investment Partners)', 'shares', '2015-03-02', 18000000, 31250000, (current_date - 35)::text, null, null, 'Value from the broker''s quarterly statement'),
  ('AST-WBT-1', 'WBT', '100% of the shares in Walker Contracting Ltd', 'business', '2009-08-10', 100, 240000000, (current_date - 1500)::text, null, null, 'Valued for the bank refinance'),
  ('AST-KWT-1', 'KWT', '33 Grenada Street, Mount Maunganui (rental)', 'property', '2021-04-30', 79000000, 86000000, (current_date - 1300)::text, null, null, null),
  ('AST-KWT-2', 'KWT', 'ASB term deposit', 'cash', '2023-05-01', 15000000, 15000000, (current_date - 20)::text, null, null, null),
  ('AST-CIT-1', 'CIT', '41 Anglesea Street, Hamilton (commercial)', 'property', '2006-03-01', 61000000, null, null, '2023-11-30', 148000000, 'Sold; trust wound up'),
  ('AST-HWT-1', 'HWT', '7 Wainui Road, Raglan (bach)', 'property', '2005-01-14', 21000000, 64000000, (current_date - 500)::text, null, null, null),
  ('AST-OFT-1', 'OFT', 'Shares in Okafor Engineering Pty Ltd', 'business', '2012-09-15', 1000, 180000000, (current_date - 200)::text, null, null, null),
  ('AST-OFT-2', 'OFT', 'Cash at bank (CBA trust account)', 'cash', '2012-09-01', null, 21400000, (current_date - 10)::text, null, null, null),
  ('AST-BRT-1', 'BRT', 'Units 3 and 4, 18 Gympie Road, Chermside', 'property', '2019-08-30', 98000000, 124000000, (current_date - 400)::text, null, null, null)
) v(ref, trust, descr, kind, acq, cost, val, valued, disp, dispc, note)
join trusts t on t.code = v.trust
on conflict (ref) do nothing;

insert into loans (ref, trust_id, person_id, direction, opened_on, terms)
select v.ref, t.id, p.id, 'owed-by-trust', v.opened::date, v.terms
from (values
  ('LN-WFT-1', 'WFT', 'P-GWALKER', '1998-05-20', 'Interest free, repayable on demand. Sale of the family home to the trust.'),
  ('LN-WFT-2', 'WFT', 'P-SWALKER', '1998-05-20', 'Interest free, repayable on demand. Sale of the family home to the trust.'),
  ('LN-KWT-1', 'KWT', 'P-WCHEN', '2021-04-30', 'Interest free, repayable on demand. Deposit on the Mount Maunganui rental.')
) v(ref, trust, person, opened, terms)
join trusts t on t.code = v.trust join people p on p.code = v.person
on conflict (ref) do nothing;

insert into loan_movements (loan_id, kind, on_date, amount_cents, note)
select l.id, v.kind, v.d::date, v.amt, v.note
from (values
  ('LN-WFT-1', 'advance', '1998-05-20', 21000000, 'Half the sale price of 18 Riverlea Road'),
  ('LN-WFT-2', 'advance', '1998-05-20', 21000000, 'Half the sale price of 18 Riverlea Road'),
  ('LN-WFT-1', 'forgiven', '2005-06-01', 2700000, 'Annual gift within the gift duty exemption'),
  ('LN-WFT-2', 'forgiven', '2005-06-01', 2700000, 'Annual gift within the gift duty exemption'),
  ('LN-WFT-1', 'forgiven', '2012-04-10', 8000000, 'Gift after gift duty was abolished'),
  ('LN-WFT-2', 'forgiven', '2012-04-10', 8000000, 'Gift after gift duty was abolished'),
  ('LN-KWT-1', 'advance', '2021-04-30', 60000000, 'Deposit on 33 Grenada Street'),
  ('LN-KWT-1', 'repayment', '2024-05-01', 5000000, 'Repaid from rent')
) v(loan, kind, d, amt, note)
join loans l on l.ref = v.loan
where not exists (select 1 from loan_movements m where m.loan_id = l.id and m.kind = v.kind and m.on_date = v.d::date);

-- Distribution resolutions for every finished year in the last three, made on time, with these
-- exceptions: none at all for the Walker Business Trust's last year, and the Brisbane Rentals Trust's
-- previous year resolved after the deed's 28 June date.
insert into resolutions (ref, trust_id, made_on, kind, income_year, summary)
select 'RES-' || t.code || '-D' || y, t.id,
  case when t.code = 'BRT' and y = income_year_of(current_date, 6) - 2 then year_end(y, 6) + 2
       when t.jurisdiction = 'AU' then year_end(y, t.balance_month) - 4
       else year_end(y, t.balance_month) + 80 end,
  'distribution', y,
  case when t.jurisdiction = 'AU' then 'Distribution of the net income of the trust for the year ended 30 June ' || y
       else 'Allocation of beneficiary income for the year ended 31 March ' || y end
from trusts t, generate_series(income_year_of(current_date, 3) - 3, income_year_of(current_date, 3)) y
where t.status = 'active' and t.code in ('WFT', 'WBT', 'KWT', 'HWT', 'OFT', 'BRT')
  and year_end(y, t.balance_month) > t.established_on
  and (case when t.code = 'BRT' and y = income_year_of(current_date, 6) - 2 then year_end(y, 6) + 2
            when t.jurisdiction = 'AU' then year_end(y, t.balance_month) - 4
            else year_end(y, t.balance_month) + 80 end) <= current_date
  and not (t.code = 'WBT' and y = income_year_of(current_date, 3) - 1)
on conflict (ref) do nothing;

insert into resolutions (ref, trust_id, made_on, kind, income_year, summary)
select v.ref, t.id, v.made::date, v.kind, v.yr::int, v.summary
from (values
  ('RES-WFT-001', 'WFT', '2022-06-28', 'appointment', null, 'Ian Walker retires as trustee on 30 June 2022; Tōtara Trustees Ltd appointed from 1 July 2022.'),
  ('RES-WFT-002', 'WFT', (current_date - 460)::text, 'annual-review', null, 'Annual review: deed and memorandum of wishes read, assets and loans reviewed, gifting paused.'),
  ('RES-WBT-001', 'WBT', (current_date - 40)::text, 'loan', null, 'Trust to lend $250,000 to Walker Contracting Ltd for a new excavator, at 7% a year.'),
  ('RES-WBT-002', 'WBT', (current_date - 120)::text, 'annual-review', null, 'Annual review: company results, dividend policy and the trustees'' loan to the company.'),
  ('RES-KWT-001', 'KWT', (current_date - 60)::text, 'annual-review', null, 'Annual review: rent reviewed, term deposit rolled, children''s education costs discussed.'),
  ('RES-HWT-001', 'HWT', (current_date - 210)::text, 'retirement', null, 'Rawiri Henare retires as trustee and releases his interest as a beneficiary.'),
  ('RES-HWT-002', 'HWT', (current_date - 90)::text, 'annual-review', null, 'Annual review: bach maintenance, insurance renewed.'),
  ('RES-OFT-001', 'OFT', (current_date - 100)::text, 'annual-review', null, 'Annual review: dividend from Okafor Engineering, Division 7A position of the bucket company.'),
  ('RES-BRT-001', 'BRT', (current_date - 330)::text, 'annual-review', null, 'Annual review: rents, body corporate levies, refinance.')
) v(ref, trust, made, kind, yr, summary)
join trusts t on t.code = v.trust
on conflict (ref) do nothing;

-- Every trustee in office signed, except Aroha Ngata on the Walker Business Trust loan resolution.
insert into resolution_signers (resolution_id, person_id, signed_on)
select x.id, r.person_id, x.made_on
from resolutions x join roles r on r.trust_id = x.trust_id and r.role = 'trustee' and r.from_on <= x.made_on and (r.to_on is null or r.to_on >= x.made_on)
join people p on p.id = r.person_id
where not (x.ref = 'RES-WBT-001' and p.code = 'P-ANGATA')
on conflict do nothing;

-- Distributions on each distribution resolution.
insert into distributions (ref, trust_id, resolution_id, person_id, income_year, kind, amount_cents, share_pct, paid_cents, paid_on, paid_to, upe_loan, note)
select 'DST-' || t.code || '-' || x.income_year || '-' || v.n, t.id, x.id, p.id, x.income_year, v.kind, v.amt, v.pct,
  case when v.paid then coalesce(v.amt, 0) else 0 end, case when v.paid then x.made_on + 20 end, v.paid_to, false, v.note
from resolutions x join trusts t on t.id = x.trust_id
join (values
  ('WFT', 1, 'P-EWALKER', 'income', 1850000, null, true, null, null),
  ('WFT', 2, 'P-TWALKER', 'income', 240000, null, true, null, 'Paid into his savings account'),
  ('WBT', 1, 'P-GWALKER', 'income', 6200000, null, true, null, null),
  ('WBT', 2, 'P-SWALKER', 'income', 4100000, null, true, null, null),
  ('KWT', 1, 'P-WCHEN', 'income', 920000, null, true, null, null),
  ('KWT', 2, 'P-LCHEN', 'income', 920000, null, true, null, null),
  ('KWT', 3, 'P-MCHEN', 'income', 90000, null, true, null, null),
  ('HWT', 1, 'P-MHENARE', 'income', 310000, null, true, null, null),
  ('OFT', 1, 'P-COKAFOR', 'income', null, 40, false, null, 'Forty per cent of the net income'),
  ('OFT', 2, 'P-NOKAFOR', 'income', null, 40, false, null, 'Forty per cent of the net income'),
  ('OFT', 3, 'P-COKAFOR', 'capital-gain', 3800000, null, true, null, 'The capital gain on the Noosa land, streamed'),
  ('BRT', 1, 'P-COKAFOR', 'income', 2100000, null, true, null, null),
  ('BRT', 2, 'P-NOKAFOR', 'income', 2100000, null, true, null, null)
) v(trust, n, person, kind, amt, pct, paid, paid_to, note) on v.trust = t.code
join people p on p.code = v.person
where x.kind = 'distribution' and (v.kind <> 'capital-gain' or x.income_year = income_year_of(current_date, 6) - 1)
on conflict (ref) do nothing;

-- The Okafor Family Trust's last year: the bucket company left unpaid, James Holt (outside the family
-- group) paid, and Ada's distribution paid to her father.
insert into distributions (ref, trust_id, resolution_id, person_id, income_year, kind, amount_cents, share_pct, paid_cents, paid_on, paid_to, upe_loan, note)
select 'DST-OFT-' || x.income_year || '-' || v.n, x.trust_id, x.id, p.id, x.income_year, 'income', v.amt, null, v.paid, case when v.paid > 0 then x.made_on + 30 end, v.paid_to, false, v.note
from resolutions x
join (values
  (4, 'P-OINV', 6000000, 0, null, 'Balance of the net income to the bucket company'),
  (5, 'P-JHOLT', 500000, 500000, null, null),
  (6, 'P-AOKAFOR', 1820000, 1820000, 'Chidi Okafor', 'Paid to her father''s account')
) v(n, person, amt, paid, paid_to, note) on true
join people p on p.code = v.person
where x.ref = 'RES-OFT-D' || (income_year_of(current_date, 6) - 1)
on conflict (ref) do nothing;

insert into documents (ref, trust_id, kind, title, dated, income_year, person_id, held_at)
select v.ref, t.id, v.kind, v.title, v.dated::date, v.yr, p.id, v.held
from (values
  ('DOC-WFT-001', 'WFT', 'deed', 'Trust deed', '1998-05-14', null, null, 'Tōtara safe, Hamilton'),
  ('DOC-WFT-002', 'WFT', 'variation', 'Deed of variation: adds power to appoint a corporate trustee', '2015-08-19', null, null, 'Tōtara safe, Hamilton'),
  ('DOC-WFT-003', 'WFT', 'memorandum-of-wishes', 'Memorandum of wishes from Graham and Susan Walker', '2016-02-10', null, null, 'Tōtara safe, Hamilton'),
  ('DOC-WFT-004', 'WFT', 'retirement', 'Deed of retirement of Ian Walker', '2022-06-30', null, 'P-IWALKER', 'Tōtara safe, Hamilton'),
  ('DOC-WFT-005', 'WFT', 'appointment', 'Deed of appointment of Tōtara Trustees Ltd', '2022-07-01', null, 'P-TOTARA', 'Tōtara safe, Hamilton'),
  ('DOC-WFT-006', 'WFT', 'loan-agreement', 'Loan agreements with Graham and Susan Walker', '1998-05-20', null, null, 'Tōtara safe, Hamilton'),
  ('DOC-WBT-001', 'WBT', 'deed', 'Trust deed', '2009-08-03', null, null, 'Tōtara safe, Hamilton'),
  ('DOC-WBT-002', 'WBT', 'contract', 'Shareholders'' agreement, Walker Contracting Ltd', '2009-08-10', null, null, 'Tōtara document vault'),
  ('DOC-KWT-001', 'KWT', 'deed', 'Trust deed', '2021-03-15', null, null, 'Tōtara document vault'),
  ('DOC-KWT-002', 'KWT', 'loan-agreement', 'Loan agreement with Wei Chen', '2021-04-30', null, null, 'Tōtara document vault'),
  ('DOC-KWT-003', 'KWT', 'memorandum-of-wishes', 'Memorandum of wishes from Wei Chen', '2021-03-15', null, null, 'Tōtara document vault'),
  ('DOC-CIT-001', 'CIT', 'deed', 'Trust deed', '2006-02-01', null, null, 'Tōtara document vault'),
  ('DOC-CIT-002', 'CIT', 'minutes', 'Resolution to wind up and final distribution', '2024-03-28', null, null, 'Tōtara document vault'),
  ('DOC-HWT-001', 'HWT', 'deed', 'Trust deed (copy; client holds the original)', '2004-11-22', null, null, 'Client holds the original'),
  ('DOC-HWT-002', 'HWT', 'retirement', 'Deed of retirement of Rawiri Henare', (current_date - 210)::text, null, 'P-RHENARE', 'Tōtara document vault'),
  ('DOC-OFT-001', 'OFT', 'deed', 'Trust deed', '2012-09-01', null, null, 'Brisbane office safe'),
  ('DOC-OFT-002', 'OFT', 'election', 'Family trust election, 2013 income year', '2013-06-30', 2013, null, 'Brisbane office safe'),
  ('DOC-BRT-001', 'BRT', 'deed', 'Trust deed', '2019-07-15', null, null, 'Brisbane office safe')
) v(ref, trust, kind, title, dated, yr, person, held)
join trusts t on t.code = v.trust left join people p on p.code = v.person
on conflict (ref) do nothing;

-- Financial statements for every finished year in the last three, signed about five months after
-- balance date. The Kōwhai Trust's last year is not done yet.
insert into documents (ref, trust_id, kind, title, dated, income_year, held_at)
select 'DOC-' || t.code || '-FS' || y, t.id, 'financial-statements', 'Financial statements for the year ended ' || to_char(year_end(y, t.balance_month), 'FMDD FMMonth YYYY'),
  year_end(y, t.balance_month) + 150, y, 'Practice file'
from trusts t, generate_series(income_year_of(current_date, 3) - 3, income_year_of(current_date, 3)) y
where t.status = 'active' and year_end(y, t.balance_month) > t.established_on and year_end(y, t.balance_month) + 150 <= current_date
  and not (t.code = 'KWT' and y = income_year_of(current_date, 3) - 1)
on conflict (ref) do nothing;

-- Copies of the deed: every trustee holds one, except Tōtara Trustees Ltd on the Walker Family Trust.
insert into document_copies (document_id, person_id, since)
select d.id, r.person_id, greatest(d.dated, r.from_on)
from documents d join roles r on r.trust_id = d.trust_id and r.role = 'trustee' and r.to_on is null
join people p on p.id = r.person_id
where d.kind in ('deed', 'variation') and not (p.code = 'P-TOTARA')
on conflict do nothing;

insert into notices (ref, trust_id, person_id, kind, role_id, given_on, reason)
select v.ref, t.id, p.id, v.kind, null, v.given::date, v.reason
from (values
  ('NTC-WFT-1', 'WFT', null, 'basic-info', (current_date - 250)::text, null),
  ('NTC-WFT-2', 'WFT', 'P-TWALKER', 'withheld', (current_date - 250)::text, 'Section 53 factors: Tom is a minor and his parents are trustees and beneficiaries; information goes to them.'),
  ('NTC-WBT-1', 'WBT', null, 'basic-info', (current_date - 120)::text, null),
  ('NTC-HWT-1', 'HWT', null, 'basic-info', (current_date - 90)::text, null),
  ('NTC-CIT-1', 'CIT', null, 'basic-info', '2023-06-01', null)
) v(ref, trust, person, kind, given, reason)
join trusts t on t.code = v.trust left join people p on p.code = v.person
on conflict (ref) do nothing;

-- Rawiri Henare's retirement was notified; Ian Walker's retirement and Tōtara's appointment were not.
insert into notices (ref, trust_id, person_id, kind, role_id, given_on, reason)
select 'NTC-HWT-2', r.trust_id, null, 'trustee-change', r.id, current_date - 195, null
from roles r join trusts t on t.id = r.trust_id join people p on p.id = r.person_id
where t.code = 'HWT' and p.code = 'P-RHENARE' and r.role = 'trustee'
on conflict (ref) do nothing;

insert into info_requests (ref, trust_id, person_id, received_on, asked_for, answered_on, outcome, reason)
select v.ref, t.id, p.id, v.rec::date, v.asked, v.ans::date, v.outcome, v.reason
from (values
  ('REQ-0001', 'KWT', 'P-LCHEN', (current_date - 200)::text, 'Copy of the trust deed and the latest financial statements', (current_date - 190)::text, 'given', null),
  ('REQ-0002', 'WBT', 'P-EWALKER', (current_date - 26)::text, 'The last three years of financial statements and the value of the company shares', null, null, null),
  ('REQ-0003', 'OFT', 'P-AOKAFOR', (current_date - 6)::text, 'Why her distribution was paid to her father', null, null, null)
) v(ref, trust, person, rec, asked, ans, outcome, reason)
join trusts t on t.code = v.trust join people p on p.code = v.person
on conflict (ref) do nothing;

insert into actions (ref, trust_id, what, owner, due_on, done_on, outcome)
select v.ref, t.id, v.what, v.owner, v.due::date, v.done::date, v.outcome
from (values
  ('ACT-0001', 'KWT', 'Get a market appraisal of 33 Grenada Street', 'Priya Shah', (current_date - 12)::text, null, null),
  ('ACT-0002', 'HWT', 'Meet Mere about what happens when the trust vests', 'Daniel Reid', (current_date + 21)::text, null, null),
  ('ACT-0003', 'OFT', 'Put the bucket company entitlement on a complying loan agreement', 'Mia Russo', (current_date + 10)::text, null, null),
  ('ACT-0004', 'WFT', 'Send Ella the updated memorandum of wishes', 'Ben Fraser', (current_date - 90)::text, (current_date - 80)::text, 'Posted')
) v(ref, trust, what, owner, due, done, outcome)
join trusts t on t.code = v.trust
on conflict (ref) do nothing;

insert into notes (trust_id, at, kind, body, actor)
select t.id, v.at::timestamptz, v.kind, v.body, v.actor
from (values
  ('WFT', (now() - interval '35 days')::text, 'call', 'Graham asked whether Tom''s distribution can go into a KiwiSaver account. Explained the minor beneficiary rule.', 'Ben Fraser'),
  ('WBT', (now() - interval '26 days')::text, 'email', 'Ella asked for the last three years of accounts and the share value. Logged as a request.', 'Ben Fraser'),
  ('KWT', (now() - interval '60 days')::text, 'meeting', 'Annual review with Wei and Lily. Lily wants a review of the rent.', 'Priya Shah'),
  ('OFT', (now() - interval '6 days')::text, 'email', 'Ada asked why her distribution went to Chidi''s account.', 'Mia Russo'),
  ('BRT', (now() - interval '330 days')::text, 'meeting', 'Annual review in Brisbane.', 'Mia Russo')
) v(trust, at, kind, body, actor)
join trusts t on t.code = v.trust
where not exists (select 1 from notes n where n.trust_id = t.id and n.body = v.body);

insert into activity (actor, action, ref, detail)
select 'Seed', 'seed', 'demo', 'Tōtara Chartered Accountants demo data loaded'
where not exists (select 1 from activity where action = 'seed');
