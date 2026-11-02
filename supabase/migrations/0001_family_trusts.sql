-- Family Trusts for Claude Code: family trust administration in plain tables.
-- Client families, trusts, the people register (trustees, settlors, appointors, beneficiaries),
-- trust property, settlor loans and gifting, trustee resolutions and who signed them,
-- distributions, the core documents and who holds a copy, beneficiary information notices and
-- requests, follow-up actions, notes and an append-only activity log. The rules each view applies,
-- with their sources, are in docs/compliance.md.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table settings (
  key text primary key,
  value text not null,
  note text
);

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

-- The last day of the balance month in a given year: year_end(2026, 3) = 2026-03-31.
create or replace function year_end(y int, m int) returns date language sql immutable as $$
  select (make_date(y, m, 1) + interval '1 month' - interval '1 day')::date
$$;

-- The income year a date falls in, named for the calendar year it ends in (NZ 2026 = 1 April 2025 to
-- 31 March 2026; AU 2026 = 1 July 2025 to 30 June 2026).
create or replace function income_year_of(d date, m int) returns int language sql immutable as $$
  select case when d <= year_end(extract(year from d)::int, m) then extract(year from d)::int else extract(year from d)::int + 1 end
$$;

-- A client family: the household or group whose trusts the practice looks after.
create table families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  name text not null,
  partner text,
  manager text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trusts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  name text not null,
  family_id uuid not null references families(id),
  jurisdiction text not null check (jurisdiction in ('NZ', 'AU')),
  kind text not null default 'discretionary' check (kind in ('discretionary', 'fixed', 'unit', 'testamentary', 'bare')),
  established_on date not null,
  -- The vesting day the deed sets. Empty in New Zealand means 125 years from creation (Trusts Act 2019 s 16).
  vesting_on date,
  balance_month int not null check (balance_month between 1 and 12),
  -- Australia: an earlier resolution date the deed sets, as MM-DD ("06-28"). Empty means 30 June.
  resolve_by text check (resolve_by is null or resolve_by ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  -- The deed lets a majority of trustees decide (Trusts Act 2019 s 38 makes unanimity the default).
  majority_allowed boolean not null default false,
  -- false for a trust that accumulates and makes no distributions, so no year-end resolution is chased.
  distributes boolean not null default true,
  family_trust_election_on date,
  tax_ref text,
  deed_held_at text,
  status text not null default 'active' check (status in ('active', 'wound-up')),
  wound_up_on date,
  external_id text unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (family_trust_election_on is null or jurisdiction = 'AU'),
  check (resolve_by is null or jurisdiction = 'AU'),
  check ((status = 'wound-up') = (wound_up_on is not null))
);

-- Anyone who holds a role in a trust: a person, a company, another trust or a charity.
-- The tax file number itself is never stored: only whether the beneficiary has quoted it.
create table people (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  kind text not null default 'individual' check (kind in ('individual', 'company', 'trust', 'charity')),
  dob date,
  email text,
  phone text,
  address text,
  tfn_quoted boolean not null default false,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dob is null or kind = 'individual')
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references trusts(id),
  person_id uuid not null references people(id),
  role text not null check (role in ('trustee', 'settlor', 'appointor', 'protector', 'beneficiary', 'default-beneficiary')),
  from_on date not null,
  to_on date,
  -- When a departing trustee handed the trust documents to a continuing trustee (Trusts Act 2019 s 48).
  docs_passed_on date,
  -- Australia: inside the family group of a trust with a family trust election (ITAA 1936 Sch 2F).
  in_family_group boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  check (to_on is null or to_on >= from_on),
  check (docs_passed_on is null or (role = 'trustee' and to_on is not null))
);
create unique index roles_one_open on roles (trust_id, person_id, role) where to_on is null;

create table assets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  description text not null,
  kind text not null check (kind in ('property', 'shares', 'cash', 'loan-receivable', 'business', 'vehicle', 'other')),
  acquired_on date,
  cost_cents bigint check (cost_cents >= 0),
  value_cents bigint check (value_cents >= 0),
  valued_on date,
  disposed_on date,
  disposal_cents bigint,
  external_id text unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Money a settlor or family member lent the trust (or the trust lent out), and every movement on it:
-- the advance, repayments and forgiveness (the gifting programme).
create table loans (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  person_id uuid not null references people(id),
  direction text not null default 'owed-by-trust' check (direction in ('owed-by-trust', 'owed-to-trust')),
  opened_on date not null,
  terms text,
  created_at timestamptz not null default now()
);
create table loan_movements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id),
  kind text not null check (kind in ('advance', 'repayment', 'forgiven', 'interest')),
  on_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  resolution_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table resolutions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  made_on date not null,
  kind text not null check (kind in ('distribution', 'annual-review', 'appointment', 'retirement', 'investment', 'loan', 'gift', 'information', 'general')),
  income_year int,
  summary text not null,
  created_at timestamptz not null default now(),
  check (kind <> 'distribution' or income_year is not null)
);
alter table loan_movements add foreign key (resolution_id) references resolutions(id);

create table resolution_signers (
  resolution_id uuid not null references resolutions(id),
  person_id uuid not null references people(id),
  signed_on date not null,
  primary key (resolution_id, person_id)
);

create table distributions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  resolution_id uuid not null references resolutions(id),
  person_id uuid not null references people(id),
  income_year int not null,
  kind text not null check (kind in ('income', 'capital', 'franked', 'capital-gain')),
  amount_cents bigint check (amount_cents >= 0),
  share_pct numeric(6,3) check (share_pct > 0 and share_pct <= 100),
  paid_cents bigint not null default 0 check (paid_cents >= 0),
  paid_on date,
  -- Australia: who actually received the money, when it was not the beneficiary (ITAA 1936 s 100A).
  paid_to text,
  -- Australia: an unpaid entitlement to a company beneficiary put on a complying loan (Div 7A).
  upe_loan boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  check (amount_cents is not null or share_pct is not null)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  kind text not null check (kind in ('deed', 'variation', 'financial-statements', 'minutes', 'appointment', 'retirement',
    'memorandum-of-wishes', 'contract', 'asset-record', 'valuation', 'loan-agreement', 'election', 'other')),
  title text not null,
  dated date,
  income_year int,
  -- The trustee or beneficiary a document is about (an appointment, a retirement).
  person_id uuid references people(id),
  held_at text,
  external_id text unique,
  created_at timestamptz not null default now()
);
-- Which trustee holds a copy (Trusts Act 2019 s 46: every trustee holds the deed and variations).
create table document_copies (
  document_id uuid not null references documents(id),
  person_id uuid not null references people(id),
  since date not null,
  primary key (document_id, person_id)
);

-- Basic trust information given to, or withheld from, a beneficiary (Trusts Act 2019 ss 51 and 53).
-- person_id empty means every beneficiary at once.
create table notices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  person_id uuid references people(id),
  kind text not null check (kind in ('basic-info', 'trustee-change', 'withheld')),
  role_id uuid references roles(id),
  given_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (kind <> 'withheld' or reason is not null),
  check (kind <> 'trustee-change' or role_id is not null)
);

-- A beneficiary's request for trust information (Trusts Act 2019 s 52).
create table info_requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid not null references trusts(id),
  person_id uuid not null references people(id),
  received_on date not null,
  asked_for text not null,
  answered_on date,
  outcome text check (outcome in ('given', 'part', 'refused')),
  reason text,
  created_at timestamptz not null default now(),
  check ((answered_on is null) = (outcome is null)),
  check (outcome is distinct from 'refused' or reason is not null)
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  trust_id uuid references trusts(id),
  what text not null,
  owner text,
  due_on date not null,
  done_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references trusts(id),
  at timestamptz not null default now(),
  kind text not null default 'note' check (kind in ('call', 'email', 'meeting', 'letter', 'note')),
  body text not null,
  actor text not null
);

create table activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  ref text,
  detail text
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'The activity log is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

create or replace function records_kept() returns trigger language plpgsql as $$
begin
  raise exception 'Trust records are kept, not deleted: close, end or mark them instead';
end $$;
create trigger trusts_kept before delete on trusts for each row execute function records_kept();
create trigger roles_kept before delete on roles for each row execute function records_kept();
create trigger resolutions_kept before delete on resolutions for each row execute function records_kept();
create trigger signers_kept before delete on resolution_signers for each row execute function records_kept();
create trigger distributions_kept before delete on distributions for each row execute function records_kept();
create trigger documents_kept before delete on documents for each row execute function records_kept();
create trigger movements_kept before delete on loan_movements for each row execute function records_kept();
create trigger notices_kept before delete on notices for each row execute function records_kept();
create trigger notes_kept before delete on notes for each row execute function records_kept();

create trigger families_touch before update on families for each row execute function touch_updated_at();
create trigger trusts_touch before update on trusts for each row execute function touch_updated_at();
create trigger people_touch before update on people for each row execute function touch_updated_at();
create trigger assets_touch before update on assets for each row execute function touch_updated_at();
create trigger actions_touch before update on actions for each row execute function touch_updated_at();

create index on roles (trust_id);
create index on roles (person_id);
create index on distributions (trust_id, income_year);
create index on resolutions (trust_id, made_on);
create index on documents (trust_id, kind);

-- ------------------------------------------------------------------ views

-- Every trust with its family, the people in office and where its year stands.
create view v_trusts as
select t.*, f.code as family, f.name as family_name, f.partner, f.manager,
  case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency,
  coalesce(t.vesting_on, case when t.jurisdiction = 'NZ' then (t.established_on + interval '125 years')::date end) as vests_on,
  income_year_of(current_date, t.balance_month) as current_year,
  income_year_of(current_date, t.balance_month) - 1 as last_year,
  (select count(*) from roles r where r.trust_id = t.id and r.role = 'trustee' and r.to_on is null)::int as trustees,
  (select count(*) from roles r where r.trust_id = t.id and r.role in ('beneficiary', 'default-beneficiary') and r.to_on is null)::int as beneficiaries,
  (select string_agg(p.name, ', ' order by p.name) from roles r join people p on p.id = r.person_id where r.trust_id = t.id and r.role = 'trustee' and r.to_on is null) as trustee_names,
  (select max(made_on) from resolutions x where x.trust_id = t.id and x.kind = 'annual-review') as last_review_on,
  (select max(made_on) from resolutions x where x.trust_id = t.id) as last_resolution_on,
  (select max(income_year) from documents d where d.trust_id = t.id and d.kind = 'financial-statements') as last_accounts_year,
  (select coalesce(sum(a.value_cents), 0) from assets a where a.trust_id = t.id and a.disposed_on is null)::bigint as assets_cents,
  greatest((select max(n.at)::date from notes n where n.trust_id = t.id), (select max(made_on) from resolutions x where x.trust_id = t.id),
    (select max(a.at)::date from activity a where a.ref = t.code)) as last_touched
from trusts t join families f on f.id = t.family_id;

-- The register of people: every role, current and past, with what the law asks about each.
create view v_register as
select r.id as role_id, t.id as trust_id, t.code as trust, t.name as trust_name, t.jurisdiction, p.id as person_id, p.code as person, p.name, p.kind as person_kind,
  r.role, r.from_on, r.to_on, r.docs_passed_on, r.in_family_group, p.dob, p.tfn_quoted, p.email,
  case when p.dob is null then null else extract(year from age(current_date, p.dob))::int end as age,
  case when r.to_on is null then 'current' else 'past' end as standing
from roles r join trusts t on t.id = r.trust_id join people p on p.id = r.person_id;

-- Loan balances: positive is what the trust still owes (or is owed).
create view v_loans as
select l.id, l.ref, l.trust_id, t.code as trust, t.jurisdiction, p.name as lender, l.direction, l.opened_on, l.terms,
  case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency,
  coalesce(sum(m.amount_cents) filter (where m.kind in ('advance', 'interest')), 0)::bigint as advanced_cents,
  coalesce(sum(m.amount_cents) filter (where m.kind = 'repayment'), 0)::bigint as repaid_cents,
  coalesce(sum(m.amount_cents) filter (where m.kind = 'forgiven'), 0)::bigint as forgiven_cents,
  (coalesce(sum(m.amount_cents) filter (where m.kind in ('advance', 'interest')), 0) - coalesce(sum(m.amount_cents) filter (where m.kind in ('repayment', 'forgiven')), 0))::bigint as balance_cents,
  max(m.on_date) filter (where m.kind = 'forgiven') as last_forgiven_on
from loans l join trusts t on t.id = l.trust_id join people p on p.id = l.person_id left join loan_movements m on m.loan_id = l.id
group by l.id, l.ref, l.trust_id, t.code, t.jurisdiction, p.name, l.direction, l.opened_on, l.terms;

-- A resolution, and whether every trustee in office that day signed it (s 38 unless the deed allows a majority).
create view v_resolutions as
select x.id, x.ref, x.trust_id, t.code as trust, t.jurisdiction, x.made_on, x.kind, x.income_year, x.summary,
  (select count(*) from roles r where r.trust_id = x.trust_id and r.role = 'trustee' and r.from_on <= x.made_on and (r.to_on is null or r.to_on >= x.made_on))::int as trustees_then,
  (select count(*) from resolution_signers s join roles r on r.person_id = s.person_id and r.trust_id = x.trust_id and r.role = 'trustee'
     and r.from_on <= x.made_on and (r.to_on is null or r.to_on >= x.made_on) where s.resolution_id = x.id)::int as signed,
  (select string_agg(p.name, ', ' order by p.name) from roles r join people p on p.id = r.person_id where r.trust_id = x.trust_id and r.role = 'trustee'
     and r.from_on <= x.made_on and (r.to_on is null or r.to_on >= x.made_on)
     and not exists (select 1 from resolution_signers s where s.resolution_id = x.id and s.person_id = r.person_id)) as unsigned_by,
  t.majority_allowed
from resolutions x join trusts t on t.id = x.trust_id;

-- Every dated obligation on every trust, and how it was met. basis: law (a statute sets it),
-- deed (the trust deed sets it), house (the practice's own rule, set in settings).
create view v_obligations as
with t as (select * from v_trusts where status = 'active'),
years as (
  select t.id as trust_id, y::int as income_year
  from t, generate_series(t.current_year - 3, t.current_year) y
  where year_end(y::int, t.balance_month) > t.established_on
),
o as (
  -- NZ: income must vest in or be paid to a beneficiary within 6 months of balance date to be beneficiary income.
  select t.id as trust_id, 'beneficiary income allocated' as item, t.code || ' ' || y.income_year as ref, y.income_year,
    (year_end(y.income_year, t.balance_month) + interval '6 months')::date as due_on,
    (select min(x.made_on) from resolutions x where x.trust_id = t.id and x.kind = 'distribution' and x.income_year = y.income_year) as done_on,
    'law' as basis, 60 as warn_days,
    'Income Tax Act 2007 s HC 6(1B): vested or paid within 6 months of balance date, or it is taxed as trustee income' as rule
  from t join years y on y.trust_id = t.id
  where t.jurisdiction = 'NZ' and t.distributes and year_end(y.income_year, t.balance_month) < current_date
  union all
  -- AU: resolve by 30 June (or the deed's earlier date), or the trustee is assessed at the top rate.
  select t.id, 'distribution resolution', t.code || ' ' || y.income_year, y.income_year,
    case when t.resolve_by is null then year_end(y.income_year, t.balance_month)
      else make_date(y.income_year, split_part(t.resolve_by, '-', 1)::int, split_part(t.resolve_by, '-', 2)::int) end,
    (select min(x.made_on) from resolutions x where x.trust_id = t.id and x.kind = 'distribution' and x.income_year = y.income_year),
    case when t.resolve_by is null then 'law' else 'deed' end, 45,
    'ITAA 1936 ss 97 and 99A; ATO trustee resolutions: resolve by 30 June' || case when t.resolve_by is null then '' else ', and by ' || t.resolve_by || ' under this deed' end
  from t join years y on y.trust_id = t.id
  where t.jurisdiction = 'AU' and t.distributes and year_end(y.income_year, t.balance_month) <= current_date + 60
  union all
  -- AU: a capital gain streamed to a beneficiary is recorded in writing within 2 months of year end.
  select t.id, 'capital gain recorded', x.ref, x.income_year, (year_end(x.income_year, t.balance_month) + interval '2 months')::date, x.made_on, 'law', 30,
    'ITAA 1997 s 115-230: specific entitlement to a capital gain is recorded within 2 months after year end'
  from t join resolutions x on x.trust_id = t.id
  where t.jurisdiction = 'AU' and exists (select 1 from distributions d where d.resolution_id = x.id and d.kind = 'capital-gain')
  union all
  -- AU: a franked distribution streamed to a beneficiary is recorded by year end.
  select t.id, 'franked distribution recorded', x.ref, x.income_year, year_end(x.income_year, t.balance_month), x.made_on, 'law', 30,
    'ITAA 1997 s 207-58: specific entitlement to a franked distribution is recorded by year end'
  from t join resolutions x on x.trust_id = t.id
  where t.jurisdiction = 'AU' and exists (select 1 from distributions d where d.resolution_id = x.id and d.kind = 'franked')
  union all
  -- The year's financial statements prepared and on file.
  select t.id, 'financial statements', t.code || ' ' || y.income_year, y.income_year,
    (year_end(y.income_year, t.balance_month) + make_interval(months => setting_num('accounts_months', 9)::int))::date,
    (select min(coalesce(d.dated, d.created_at::date)) from documents d where d.trust_id = t.id and d.kind = 'financial-statements' and d.income_year = y.income_year),
    'house', 30, 'Trusts Act 2019 s 45(f) (NZ) keeps them; the practice prepares them within ' || setting_num('accounts_months', 9) || ' months of year end'
  from t join years y on y.trust_id = t.id
  where year_end(y.income_year, t.balance_month) < current_date
  union all
  -- The annual review with the trustees: the next one due.
  select t.id, 'annual review', t.code, null::int,
    (coalesce(t.last_review_on, t.established_on) + make_interval(months => setting_num('review_months', 12)::int))::date, null::date,
    'house', 30, 'House rule: trustees meet and minute a review every ' || setting_num('review_months', 12) || ' months (Trusts Act 2019 s 23: know the terms; s 32: consider the powers)'
  from t
  union all
  -- NZ: consider at reasonable intervals whether to make basic trust information available.
  select t.id, 'basic information considered', t.code, null::int,
    (coalesce((select max(n.given_on) from notices n where n.trust_id = t.id and n.kind in ('basic-info', 'withheld')), greatest(t.established_on, date '2021-01-30'))
      + make_interval(months => setting_num('info_review_months', 12)::int))::date, null::date,
    'law', 30, 'Trusts Act 2019 s 51(4): consider at reasonable intervals; the interval here is ' || setting_num('info_review_months', 12) || ' months'
  from t where t.jurisdiction = 'NZ'
  union all
  -- NZ: tell beneficiaries of each appointment, removal and retirement of a trustee as it occurs.
  select t.id, case when r.to_on is null then 'trustee appointment notified' else 'trustee retirement notified' end, p.name, null::int,
    coalesce(r.to_on, r.from_on) + setting_num('notice_days', 30)::int,
    (select min(n.given_on) from notices n where n.role_id = r.id and n.kind in ('trustee-change', 'withheld')),
    'law', setting_num('notice_days', 30)::int, 'Trusts Act 2019 s 51(3)(c): each appointment, removal and retirement, as it occurs (' || setting_num('notice_days', 30) || ' days here)'
  from t join roles r on r.trust_id = t.id and r.role = 'trustee' join people p on p.id = r.person_id
  where t.jurisdiction = 'NZ' and coalesce(r.to_on, r.from_on) >= date '2021-01-30' and (r.to_on is not null or r.from_on > t.established_on)
  union all
  -- A departing trustee hands the documents to a continuing trustee.
  select t.id, 'documents passed on', p.name, null::int, r.to_on, r.docs_passed_on,
    case when t.jurisdiction = 'NZ' then 'law' else 'house' end, 14,
    case when t.jurisdiction = 'NZ' then 'Trusts Act 2019 s 48: at the time the trusteeship ends' else 'House rule: the outgoing trustee hands over the trust records' end
  from t join roles r on r.trust_id = t.id and r.role = 'trustee' join people p on p.id = r.person_id
  where r.to_on is not null
  union all
  -- A beneficiary's request for trust information, answered within a reasonable period.
  select t.id, 'information request answered', q.ref, null::int, q.received_on + setting_num('request_days', 20)::int, q.answered_on,
    case when t.jurisdiction = 'NZ' then 'law' else 'house' end, setting_num('request_days', 20)::int,
    case when t.jurisdiction = 'NZ' then 'Trusts Act 2019 s 52: within a reasonable period (' || setting_num('request_days', 20) || ' days here)'
      else 'House rule: answer within ' || setting_num('request_days', 20) || ' days, subject to the deed' end
  from t join info_requests q on q.trust_id = t.id
  union all
  -- The trust ends on its vesting day: the deed's, or 125 years in New Zealand.
  select t.id, 'trust vests', t.code, null::int, t.vests_on, null::date,
    case when t.vesting_on is null then 'law' else 'deed' end, setting_num('vesting_warn_days', 730)::int,
    case when t.vesting_on is null then 'Trusts Act 2019 s 16: 125 years from creation' else 'The vesting day in the trust deed' end
  from t where t.vests_on is not null
)
select o.*, t.code as trust, t.name as trust_name, t.family, t.manager, t.jurisdiction,
  (o.due_on - current_date)::int as days_left,
  case
    when o.done_on is not null and o.done_on > o.due_on then 'done late'
    when o.done_on is not null then 'done'
    when o.due_on < current_date then 'overdue'
    when o.due_on <= current_date + o.warn_days then 'due soon'
    else 'open'
  end as standing
from o join t on t.id = o.trust_id;
