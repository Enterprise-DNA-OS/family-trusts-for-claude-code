// The rules of the trust desk. scripts/trusts.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Dates are calendar dates (YYYY-MM-DD). Income years are named for the calendar year they end in.
// The rules and their sources are in docs/compliance.md.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}
const pastDate = (v, label) => {
  const d = v === undefined || v === true ? today() : date(v, label);
  if (d > today()) throw Error(`--${label} cannot be in the future: record it once it has happened`);
  return d;
};

// "1450.00" or "$1,450" -> 145000 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 1450.00`);
  return Math.round(parseFloat(s) * 100);
}
function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);
const flag = (v) => v === true || ['yes', 'true', '1'].includes(String(v ?? '').toLowerCase());
const iso = (d) => (d ? String(d instanceof Date ? d.toISOString() : d).slice(0, 10) : null);

export const ROLES = ['trustee', 'settlor', 'appointor', 'protector', 'beneficiary', 'default-beneficiary'];
const PERSON_KINDS = ['individual', 'company', 'trust', 'charity'];
const TRUST_KINDS = ['discretionary', 'fixed', 'unit', 'testamentary', 'bare'];
const ASSET_KINDS = ['property', 'shares', 'cash', 'loan-receivable', 'business', 'vehicle', 'other'];
const RES_KINDS = ['distribution', 'annual-review', 'appointment', 'retirement', 'investment', 'loan', 'gift', 'information', 'general'];
const DIST_KINDS = ['income', 'capital', 'franked', 'capital-gain'];
const DOC_KINDS = ['deed', 'variation', 'financial-statements', 'minutes', 'appointment', 'retirement', 'memorandum-of-wishes', 'contract', 'asset-record', 'valuation', 'loan-agreement', 'election', 'other'];
const NOTE_KINDS = ['call', 'email', 'meeting', 'letter', 'note'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}
async function nextRef(db, table, prefix, width) {
  const [r] = await db.query(`select coalesce(max(substring(ref from '[0-9]+$')::int), 0) + 1 as n from ${table} where ref ~ $1`, [`^${prefix.replace(/[-]/g, '\\-')}[0-9]+$`]);
  return `${prefix}${String(r.n).padStart(width, '0')}`;
}

// Resolve one record from a code, reference, id or name. Exact (case-insensitive) beats partial;
// more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const family = async (db, term) => choose(await db.query('select * from families order by code'), term, 'Family', (r) => [r.code, r.name, r.id]);
export const trust = async (db, term) => choose(await db.query('select * from v_trusts order by code'), term, 'Trust', (r) => [r.code, r.name, r.id]);
export const person = async (db, term) => choose(await db.query('select * from people order by code'), term, 'Person', (r) => [r.code, r.name, r.id]);
const resolution = async (db, term) => choose(await db.query('select * from v_resolutions order by ref'), term, 'Resolution', (r) => [r.ref, r.id]);
const asset = async (db, term) => choose(await db.query('select a.*, t.code as trust, t.jurisdiction from assets a join trusts t on t.id = a.trust_id order by a.ref'), term, 'Asset', (r) => [r.ref, r.description, r.id]);
const loan = async (db, term) => choose(await db.query('select * from v_loans order by ref'), term, 'Loan', (r) => [r.ref, r.id]);
const distribution = async (db, term) => choose(await db.query('select d.*, t.code as trust, t.jurisdiction from distributions d join trusts t on t.id = d.trust_id order by d.ref'), term, 'Distribution', (r) => [r.ref, r.id]);
const document = async (db, term) => choose(await db.query('select d.*, t.code as trust from documents d join trusts t on t.id = d.trust_id order by d.ref'), term, 'Document', (r) => [r.ref, r.title, r.id]);
const request = async (db, term) => choose(await db.query('select q.*, t.code as trust, t.jurisdiction from info_requests q join trusts t on t.id = q.trust_id order by q.ref'), term, 'Request', (r) => [r.ref, r.id]);
const action = async (db, term) => choose(await db.query('select * from actions order by ref'), term, 'Action', (r) => [r.ref, r.id]);

// A role a person holds in a trust, current unless --all.
async function roleOf(db, t, p, role, { current = true } = {}) {
  const rows = await db.query(`select * from roles where trust_id = $1 and person_id = $2 and role = $3 ${current ? 'and to_on is null' : ''} order by from_on desc`, [t.id, p.id, role]);
  return rows[0] || null;
}
async function trusteesOn(db, trustId, day) {
  return db.query(`select p.id, p.name from roles r join people p on p.id = r.person_id where r.trust_id = $1 and r.role = 'trustee'
    and r.from_on <= $2 and (r.to_on is null or r.to_on >= $2) order by p.name`, [trustId, day]);
}
function activeTrust(t) {
  if (t.status !== 'active') throw Error(`${t.code} was wound up on ${iso(t.wound_up_on)}`);
}
const cur = (j) => (j === 'NZ' ? 'NZD' : 'AUD');
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body, { mode: 0o600 });
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// ------------------------------------------------------------------ attention and compliance

const ATTENTION = `
  select 0 as rank, item || ' ' || standing as item, trust as ref, coalesce(ref || ': ', '') || 'due ' || due_on || '. ' || rule as detail
    from v_obligations where basis in ('law', 'deed') and standing = 'overdue'
  union all
  select 0, 'not signed by every trustee', ref, trust || ' ' || kind || ' resolution of ' || made_on || ': ' || unsigned_by || ' did not sign. Trusts Act 2019 s 38 (NZ) / the deed'
    from v_resolutions where signed < trustees_then and not (majority_allowed and signed * 2 > trustees_then)
  union all
  select 0, 'sole trustee is the sole beneficiary', t.code, t.name || ': ' || t.trustee_names || ' holds every interest. Legal and beneficial ownership merge and the trust can fail. Appoint a second trustee or add beneficiaries.'
    from v_trusts t where t.status = 'active' and t.trustees = 1 and t.beneficiaries = 1
      and exists (select 1 from roles a join roles b on b.person_id = a.person_id and b.trust_id = a.trust_id
        where a.trust_id = t.id and a.role = 'trustee' and a.to_on is null and b.role in ('beneficiary', 'default-beneficiary') and b.to_on is null)
  union all
  select 1, item || ' due soon', trust, coalesce(ref || ': ', '') || 'due ' || due_on || ' (' || days_left || ' days). ' || rule
    from v_obligations where basis in ('law', 'deed') and standing = 'due soon'
  union all
  select 1, 'no copy of the deed', t.code, p.name || ' is a trustee of ' || t.name || ' and holds no copy of the deed or a variation. Trusts Act 2019 s 46(a)'
    from roles r join trusts t on t.id = r.trust_id join people p on p.id = r.person_id
    where t.status = 'active' and t.jurisdiction = 'NZ' and r.role = 'trustee' and r.to_on is null
      and exists (select 1 from documents d where d.trust_id = t.id and d.kind in ('deed', 'variation'))
      and exists (select 1 from documents d where d.trust_id = t.id and d.kind in ('deed', 'variation')
        and not exists (select 1 from document_copies c where c.document_id = d.id and c.person_id = p.id))
  union all
  select 1, 'no trust deed on file', t.code, t.name || ': the deed is the first core document. Trusts Act 2019 s 45(a) (NZ); ask the client or the original adviser for a copy'
    from trusts t where t.status = 'active' and not exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'deed')
  union all
  select 1, 'no appointment record', t.code, p.name || ' became a trustee on ' || r.from_on || ' with no deed of appointment on file. Trusts Act 2019 s 45(g) (NZ)'
    from roles r join trusts t on t.id = r.trust_id join people p on p.id = r.person_id
    where t.status = 'active' and r.role = 'trustee' and r.to_on is null and r.from_on > t.established_on
      and not exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'appointment' and d.person_id = p.id)
  union all
  select 1, 'minor beneficiary income', t.code, p.name || ' (under 16 at year end) allocated ' || (sum(d.amount_cents) / 100.0)::numeric(12,2) || ' NZD for ' || d.income_year
    || ': over $1,000 is taxed at the trustee rate, not his or her own. Income Tax Act 2007 s HC 35'
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    where t.jurisdiction = 'NZ' and d.kind = 'income' and d.income_year = income_year_of(current_date, t.balance_month) - 1
      and p.dob is not null and p.dob > year_end(d.income_year, t.balance_month) - interval '16 years'
    group by t.code, p.name, d.income_year having sum(d.amount_cents) > 100000
  union all
  select 1, 'outside the family group', t.code, p.name || ' received ' || coalesce((d.amount_cents / 100.0)::numeric(12,2)::text || ' AUD', d.share_pct || '%') || ' for ' || d.income_year
    || ' from a trust with a family trust election. Family trust distribution tax applies. ITAA 1936 Sch 2F s 271-15'
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    join roles r on r.trust_id = t.id and r.person_id = p.id and r.role in ('beneficiary', 'default-beneficiary') and not r.in_family_group
    where t.family_trust_election_on is not null and d.income_year >= extract(year from t.family_trust_election_on)
      and d.income_year >= income_year_of(current_date, t.balance_month) - 1
  union all
  select 1, 'unpaid entitlement to a company', t.code, p.name || ' is owed ' || ((d.amount_cents - d.paid_cents) / 100.0)::numeric(12,2) || ' AUD from ' || d.income_year
    || ' with no complying loan. Pay it or put it on a loan agreement by the company''s lodgment day. ITAA 1936 Div 7A; TD 2022/11'
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    where t.jurisdiction = 'AU' and p.kind = 'company' and d.amount_cents > d.paid_cents and not d.upe_loan
      and year_end(d.income_year, t.balance_month) < current_date
  union all
  select 2, 'paid to someone else', t.code, p.name || '''s ' || d.income_year || ' distribution (' || d.ref || ') was paid to ' || d.paid_to
    || '. Check it against ITAA 1936 s 100A and the ATO''s PCG 2022/2 before the return goes in'
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    where t.jurisdiction = 'AU' and d.paid_to is not null and d.paid_to <> p.name and d.income_year >= income_year_of(current_date, t.balance_month) - 1
  union all
  select 2, 'no TFN quoted', t.code, p.name || ' is entitled for ' || d.income_year || ' and has not quoted a TFN to the trustee. Withhold at the top rate from any payment (closely held trust TFN withholding)'
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    where t.jurisdiction = 'AU' and not p.tfn_quoted and d.income_year >= income_year_of(current_date, t.balance_month) - 1
  union all
  select 3, item || ' ' || standing, trust, coalesce(ref || ': ', '') || 'due ' || due_on || '. ' || rule
    from v_obligations where basis = 'house' and standing in ('overdue', 'due soon')
  union all
  select 3, 'action overdue', a.ref, coalesce(t.code || ': ', '') || a.what || ' (due ' || a.due_on || coalesce(', ' || a.owner, '') || ')'
    from actions a left join trusts t on t.id = a.trust_id where a.done_on is null and a.due_on < current_date
  union all
  select 4, 'not valued in ' || setting_num('revalue_years', 3) || ' years', a.ref, t.code || ': ' || a.description || ', last valued ' || coalesce(a.valued_on::text, 'never')
    from assets a join trusts t on t.id = a.trust_id where t.status = 'active' and a.disposed_on is null and a.kind in ('property', 'business')
      and coalesce(a.valued_on, a.acquired_on, '1900-01-01') < current_date - make_interval(years => setting_num('revalue_years', 3)::int)
  union all
  select 4, 'gone quiet', code, name || ': nothing recorded since ' || coalesce(last_touched::text, 'it was set up')
    from v_trusts where status = 'active' and coalesce(last_touched, established_on) < current_date - setting_num('quiet_days', 150)::int
`;

export const QUESTIONS = [
  { question: 'What does each family hold in trust, and when was each trust last valued?', sql: `
    select t.family, t.code as trust, t.currency, sum(a.value_cents)::bigint as value_cents, min(a.valued_on) as oldest_valuation, count(a.id)::int as assets
    from v_trusts t join assets a on a.trust_id = t.id and a.disposed_on is null where t.status = 'active'
    group by t.family, t.code, t.currency order by t.family, value_cents desc` },
  { question: 'How much does each trust still owe its settlors, and how much was forgiven in the last five years?', sql: `
    select l.trust, l.lender, l.currency, l.balance_cents, l.forgiven_cents,
      coalesce((select sum(m.amount_cents) from loan_movements m where m.loan_id = l.id and m.kind = 'forgiven' and m.on_date >= current_date - interval '5 years'), 0)::bigint as forgiven_5y_cents,
      l.last_forgiven_on
    from v_loans l where l.direction = 'owed-by-trust' order by l.balance_cents desc` },
  { question: "Who has received the most from each family's trusts over the last four years?", sql: `
    select f.code as family, p.name as beneficiary, max(case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end) as currency,
      sum(d.amount_cents)::bigint as amount_cents, count(*)::int as distributions, count(distinct t.id)::int as trusts,
      count(*) filter (where d.amount_cents is null)::int as by_share_only
    from distributions d join trusts t on t.id = d.trust_id join families f on f.id = t.family_id join people p on p.id = d.person_id
    where d.income_year >= extract(year from current_date)::int - 4 group by f.code, p.name order by f.code, amount_cents desc nulls last` },
  { question: 'Which legal and deed deadlines were missed or met late in the last three years, by manager?', sql: `
    select coalesce(manager, 'no manager') as manager, item, count(*) filter (where standing = 'overdue')::int as missed,
      count(*) filter (where standing = 'done late')::int as late, count(*) filter (where standing = 'done')::int as on_time
    from v_obligations where basis in ('law', 'deed') and due_on >= current_date - interval '3 years' and due_on <= current_date
    group by manager, item having count(*) filter (where standing in ('overdue', 'done late')) > 0 order by missed desc, late desc` },
  { question: 'How long after balance date does each trust make its distribution resolution?', sql: `
    select t.code as trust, t.jurisdiction, count(*)::int as years,
      round(avg(x.made_on - year_end(x.income_year, t.balance_month)))::int as avg_days_after,
      max(x.made_on - year_end(x.income_year, t.balance_month))::int as latest_days_after
    from resolutions x join trusts t on t.id = x.trust_id where x.kind = 'distribution' group by t.code, t.jurisdiction order by avg_days_after desc` },
  { question: 'Who is a trustee of more than one trust, and which?', sql: `
    select p.name, p.kind, count(*)::int as trusts, string_agg(t.code, ', ' order by t.code) as trust_codes
    from roles r join people p on p.id = r.person_id join trusts t on t.id = r.trust_id
    where r.role = 'trustee' and r.to_on is null and t.status = 'active' group by p.name, p.kind having count(*) > 1 order by trusts desc` },
  { question: 'Which beneficiaries have never been given basic trust information, and has anyone decided to withhold it?', sql: `
    select g.trust, g.name as beneficiary, g.age,
      case when exists (select 1 from notices n where n.trust_id = g.trust_id and n.kind = 'withheld' and n.person_id = g.person_id) then 'withheld (reason recorded)' else 'never given' end as status
    from v_register g join trusts t on t.id = g.trust_id
    where t.jurisdiction = 'NZ' and t.status = 'active' and g.standing = 'current' and g.role in ('beneficiary', 'default-beneficiary')
      and (exists (select 1 from notices n where n.trust_id = g.trust_id and n.kind = 'withheld' and n.person_id = g.person_id)
        or not exists (select 1 from notices n where n.trust_id = g.trust_id and n.kind = 'basic-info' and (n.person_id is null or n.person_id = g.person_id)))
    order by g.trust, g.name` },
  { question: 'Which beneficiaries are under 16, and what have they been allocated each year?', sql: `
    select t.code as trust, p.name, extract(year from age(current_date, p.dob))::int as age, d.income_year, sum(d.amount_cents)::bigint as amount_cents,
      case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency
    from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
    where p.dob > current_date - interval '16 years' group by t.code, t.jurisdiction, p.name, p.dob, d.income_year order by p.name, d.income_year` },
  { question: 'Which properties and businesses have not been valued in three years?', sql: `
    select t.code as trust, a.ref, a.description, a.value_cents, case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency, a.valued_on,
      (current_date - a.valued_on)::int as days_since
    from assets a join trusts t on t.id = a.trust_id
    where a.disposed_on is null and a.kind in ('property', 'business') and coalesce(a.valued_on, '1900-01-01') < current_date - interval '3 years' order by a.valued_on nulls first` },
  { question: 'Which trusts vest in the next ten years, and what do they hold?', sql: `
    select t.code as trust, t.name, t.vests_on, (t.vests_on - current_date)::int as days_left, t.assets_cents, t.currency, t.trustee_names
    from v_trusts t where t.status = 'active' and t.vests_on <= current_date + interval '10 years' order by t.vests_on` },
];

// ------------------------------------------------------------------ reads

export const reads = {
  async families(db) {
    return db.query(`select f.code, f.name, f.partner, f.manager,
      (select count(*) from trusts t where t.family_id = f.id and t.status = 'active')::int as trusts,
      (select count(*) from v_obligations o join trusts t on t.id = o.trust_id where t.family_id = f.id and o.standing = 'overdue')::int as overdue
      from families f order by f.code`);
  },
  async family(db, [term]) {
    const f = await family(db, term);
    return {
      family: f,
      trusts: await db.query('select code, name, jurisdiction, status, trustee_names, beneficiaries, assets_cents, currency from v_trusts where family_id = $1 order by code', [f.id]),
      obligations: await db.query(`select trust, item, ref, due_on, standing from v_obligations o join trusts t on t.id = o.trust_id where t.family_id = $1 and standing in ('overdue', 'due soon') order by due_on`, [f.id]),
    };
  },
  async trusts(db, a, f) {
    const fam = f.family ? await family(db, f.family) : null;
    return db.query(`select code, name, family, jurisdiction, status, trustees, beneficiaries, last_review_on, last_accounts_year, vests_on, assets_cents, currency,
      (select count(*) from v_obligations o where o.trust_id = v_trusts.id and o.standing = 'overdue')::int as overdue
      from v_trusts where ($1::uuid is null or family_id = $1) and ($2::boolean or status = 'active') order by family, code`, [fam?.id ?? null, !!f.all]);
  },
  async trust(db, [term]) {
    const t = await trust(db, term);
    return {
      trust: t,
      people: await db.query(`select name, role, from_on, to_on from v_register where trust_id = $1 order by standing, case role when 'trustee' then 0 when 'settlor' then 1 when 'appointor' then 2 when 'protector' then 3 else 4 end, name`, [t.id]),
      obligations: await db.query(`select item, ref, due_on, done_on, standing, basis from v_obligations where trust_id = $1 and standing not in ('done') order by due_on`, [t.id]),
      assets: await db.query('select ref, description, value_cents, $2::text as currency, valued_on from assets where trust_id = $1 and disposed_on is null order by ref', [t.id, t.currency]),
      loans: await db.query('select ref, lender, direction, balance_cents, currency from v_loans where trust_id = $1 order by ref', [t.id]),
      resolutions: await db.query('select ref, made_on, kind, income_year, summary from resolutions where trust_id = $1 order by made_on desc limit 8', [t.id]),
    };
  },
  async register(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select trust, name, person_kind as kind, role, from_on, to_on, age, case when jurisdiction = 'AU' and role like '%beneficiary' then case when tfn_quoted then 'yes' else 'no' end end as tfn_quoted
      from v_register where ($1::uuid is null or trust_id = $1) and ($2::boolean or standing = 'current') order by trust, role, name`, [t?.id ?? null, !!f.all]);
  },
  async people(db) {
    return db.query(`select p.code, p.name, p.kind, p.email,
      (select string_agg(distinct t.code || ' ' || r.role, ', ') from roles r join trusts t on t.id = r.trust_id where r.person_id = p.id and r.to_on is null) as roles
      from people p order by p.name`);
  },
  async person(db, [term]) {
    const p = await person(db, term);
    return {
      person: p,
      roles: await db.query('select trust, trust_name, role, from_on, to_on from v_register where person_id = $1 order by standing, trust', [p.id]),
      distributions: await db.query(`select d.ref, t.code as trust, d.income_year, d.kind, d.amount_cents, d.share_pct, d.paid_cents, case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency
        from distributions d join trusts t on t.id = d.trust_id where d.person_id = $1 order by d.income_year desc, d.ref`, [p.id]),
      requests: await db.query('select q.ref, t.code as trust, q.received_on, q.asked_for, q.answered_on, q.outcome from info_requests q join trusts t on t.id = q.trust_id where q.person_id = $1 order by q.received_on desc', [p.id]),
    };
  },
  async assets(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select a.ref, t.code as trust, a.description, a.kind, a.cost_cents, a.value_cents, case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency, a.valued_on, a.disposed_on
      from assets a join trusts t on t.id = a.trust_id where ($1::uuid is null or t.id = $1) and ($2::boolean or a.disposed_on is null) order by t.code, a.ref`, [t?.id ?? null, !!f.all]);
  },
  async loans(db, [term]) {
    const t = term ? await trust(db, term) : null;
    const rows = await db.query('select * from v_loans where ($1::uuid is null or trust_id = $1) order by trust, ref', [t?.id ?? null]);
    return rows.map((l) => ({ ref: l.ref, trust: l.trust, lender: l.lender, direction: l.direction, advanced_cents: l.advanced_cents, repaid_cents: l.repaid_cents, forgiven_cents: l.forgiven_cents, balance_cents: l.balance_cents, currency: l.currency, last_forgiven_on: l.last_forgiven_on }));
  },
  async resolutions(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select ref, trust, made_on, kind, income_year, signed || ' of ' || trustees_then as signed, coalesce(unsigned_by, '') as unsigned_by, summary
      from v_resolutions where ($1::uuid is null or trust_id = $1) and ($2::int is null or income_year = $2) order by made_on desc limit 40`, [t?.id ?? null, f.year ? num(f.year, 'year', { min: 1900, max: 2200 }) : null]);
  },
  async resolution(db, [term]) {
    const r = await resolution(db, term);
    return {
      resolution: r,
      signatures: await db.query('select p.name, s.signed_on from resolution_signers s join people p on p.id = s.person_id where s.resolution_id = $1 order by p.name', [r.id]),
      distributions: await db.query(`select d.ref, p.name as beneficiary, d.kind, d.amount_cents, d.share_pct, d.paid_cents, d.paid_on, d.paid_to, $2::text as currency
        from distributions d join people p on p.id = d.person_id where d.resolution_id = $1 order by d.ref`, [r.id, cur(r.jurisdiction)]),
    };
  },
  async distributions(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select d.ref, t.code as trust, d.income_year, p.name as beneficiary, d.kind, d.amount_cents, d.share_pct, d.paid_cents, case when t.jurisdiction = 'NZ' then 'NZD' else 'AUD' end as currency, d.paid_on, coalesce(d.paid_to, '') as paid_to
      from distributions d join trusts t on t.id = d.trust_id join people p on p.id = d.person_id
      where ($1::uuid is null or t.id = $1) and ($2::int is null or d.income_year = $2) and ($3::boolean is false or d.paid_cents < coalesce(d.amount_cents, 1))
      order by d.income_year desc, t.code, d.ref`, [t?.id ?? null, f.year ? num(f.year, 'year', { min: 1900, max: 2200 }) : null, !!f.unpaid]);
  },
  async documents(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select d.ref, t.code as trust, d.kind, d.title, d.dated, d.income_year, coalesce(d.held_at, '') as held_at,
      (select string_agg(p.name, ', ' order by p.name) from document_copies c join people p on p.id = c.person_id where c.document_id = d.id) as copies_with
      from documents d join trusts t on t.id = d.trust_id where ($1::uuid is null or t.id = $1) and ($2::text is null or d.kind = $2) order by t.code, d.dated nulls last, d.ref`,
    [t?.id ?? null, f.kind ? oneOf(String(f.kind), DOC_KINDS, 'kind') : null]);
  },
  // The core documents a New Zealand trustee keeps (Trusts Act 2019 s 45), trust by trust: what is on file and what is not.
  async 'core-documents'(db, [term]) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select t.code as trust,
      case when exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'deed') then 'yes' else 'MISSING' end as deed,
      (select count(*) from documents d where d.trust_id = t.id and d.kind = 'variation')::int as variations,
      case when exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'financial-statements' and d.income_year = income_year_of(current_date, t.balance_month) - 1) then 'yes'
        else 'not yet' end as last_year_accounts,
      (select count(*) from resolutions x where x.trust_id = t.id)::int as decisions,
      (select count(*) from roles r where r.trust_id = t.id and r.role = 'trustee' and r.from_on > t.established_on
        and not exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'appointment' and d.person_id = r.person_id))::int as appointments_missing,
      case when exists (select 1 from documents d where d.trust_id = t.id and d.kind = 'memorandum-of-wishes') then 'yes' else 'none on file' end as wishes,
      (select count(*) from assets a where a.trust_id = t.id and a.disposed_on is null)::int as assets_recorded
      from trusts t where t.status = 'active' and ($1::uuid is null or t.id = $1) order by t.code`, [t?.id ?? null]);
  },
  async notices(db, [term]) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select n.ref, t.code as trust, coalesce(p.name, 'every beneficiary') as to_whom, n.kind, n.given_on, coalesce(rp.name, '') as about_trustee, coalesce(n.reason, '') as reason
      from notices n join trusts t on t.id = n.trust_id left join people p on p.id = n.person_id left join roles r on r.id = n.role_id left join people rp on rp.id = r.person_id
      where ($1::uuid is null or t.id = $1) order by n.given_on desc`, [t?.id ?? null]);
  },
  async requests(db, a, f) {
    return db.query(`select q.ref, t.code as trust, p.name as beneficiary, q.received_on, q.received_on + setting_num('request_days', 20)::int as due_on, q.asked_for,
      q.answered_on, coalesce(q.outcome, '') as outcome
      from info_requests q join trusts t on t.id = q.trust_id join people p on p.id = q.person_id where ($1::boolean is false or q.answered_on is null) order by q.received_on desc`, [!!f.open]);
  },
  async obligations(db, [term], f) {
    const t = term ? await trust(db, term) : null;
    return db.query(`select trust, item, coalesce(ref, '') as ref, due_on, done_on, standing, basis, rule from v_obligations
      where ($1::uuid is null or trust_id = $1) and ($2::boolean or standing not in ('done', 'open')) order by due_on`, [t?.id ?? null, !!f.all]);
  },
  // Year end for every trust: is the resolution made, the accounts done, the beneficiary income allocated?
  async 'year-end'(db, a, f) {
    const yr = f.year ? num(f.year, 'year', { min: 1990, max: 2200 }) : null;
    return db.query(`select t.code as trust, t.jurisdiction, coalesce($1::int, t.last_year) as income_year,
      year_end(coalesce($1::int, t.last_year), t.balance_month) as balance_date,
      (select min(x.made_on) from resolutions x where x.trust_id = t.id and x.kind = 'distribution' and x.income_year = coalesce($1::int, t.last_year)) as resolved_on,
      (select o.standing from v_obligations o where o.trust_id = t.id and o.item in ('beneficiary income allocated', 'distribution resolution') and o.income_year = coalesce($1::int, t.last_year)) as resolution,
      (select count(*) from distributions d where d.trust_id = t.id and d.income_year = coalesce($1::int, t.last_year))::int as distributions,
      (select o.standing from v_obligations o where o.trust_id = t.id and o.item = 'financial statements' and o.income_year = coalesce($1::int, t.last_year)) as accounts
      from v_trusts t where t.status = 'active' and t.distributes order by t.jurisdiction, t.code`, [yr]);
  },
  async attention(db) {
    return db.query(`select item, ref, detail from (${ATTENTION}) a order by rank, item, ref`);
  },
  async compliance(db) {
    return db.query(`select basis, item, count(*) filter (where standing = 'overdue')::int as overdue, count(*) filter (where standing = 'due soon')::int as due_soon,
      count(*) filter (where standing = 'done late')::int as done_late, count(*) filter (where standing = 'done')::int as done, min(rule) as rule
      from v_obligations group by basis, item order by case basis when 'law' then 0 when 'deed' then 1 else 2 end, overdue desc, item`);
  },
  async insights(db) {
    const out = [];
    for (const q of QUESTIONS) out.push({ question: q.question, rows: await db.query(q.sql) });
    return out;
  },
  async actions(db, a, f) {
    return db.query(`select a.ref, coalesce(t.code, '') as trust, a.what, a.owner, a.due_on, a.done_on, coalesce(a.outcome, '') as outcome
      from actions a left join trusts t on t.id = a.trust_id where ($1::boolean or a.done_on is null) order by a.due_on`, [!!f.all]);
  },
  async activity(db, a, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 30;
    return db.query(`select at, actor, action, ref, detail from activity where at >= now() - make_interval(days => $1::int) order by at desc limit 100`, [days]);
  },
  async settings(db) {
    return db.query('select key, value, note from settings order by key');
  },
};

// ------------------------------------------------------------------ writes

const setFrom = (t, j, row) => ({ ...row, currency: cur(j || t?.jurisdiction) });

export const writes = {
  async 'add-family'(db, [code], f) {
    const actor = actorOf(f);
    need(f, 'name');
    if (!/^[A-Z0-9-]{2,16}$/.test(String(code || ''))) throw Error('Usage: add-family <CODE> --name="..." (CODE is 2 to 16 capitals, digits or dashes)');
    return tx(db, async () => {
      await db.query('insert into families (code, name, partner, manager, email) values ($1,$2,$3,$4,$5)', [code, text(f.name), text(f.partner), text(f.manager), text(f.email)]);
      await log(db, actor, 'add-family', code, text(f.name));
      return { family: code, name: text(f.name) };
    });
  },
  async 'add-trust'(db, [code], f) {
    const actor = actorOf(f);
    need(f, 'name', 'family', 'jurisdiction', 'established');
    if (!/^[A-Z0-9-]{2,16}$/.test(String(code || ''))) throw Error('Usage: add-trust <CODE> --name=... --family=... --jurisdiction=NZ|AU --established=YYYY-MM-DD');
    const fam = await family(db, f.family);
    const j = oneOf(String(f.jurisdiction).toUpperCase(), ['NZ', 'AU'], 'jurisdiction');
    const est = pastDate(f.established, 'established');
    const bm = f['balance-month'] ? num(f['balance-month'], 'balance-month', { min: 1, max: 12 }) : j === 'NZ' ? 3 : 6;
    const vest = f.vesting ? date(f.vesting, 'vesting') : null;
    if (vest && vest <= est) throw Error('--vesting must be after the trust was established');
    if (j === 'AU' && !vest) throw Error('An Australian trust needs --vesting: the vesting day in the deed');
    if (f['resolve-by'] && j !== 'AU') throw Error("--resolve-by is the Australian deed's resolution date");
    if (f['fte'] && j !== 'AU') throw Error('--fte is a family trust election, an Australian election');
    return tx(db, async () => {
      await db.query(`insert into trusts (code, name, family_id, jurisdiction, kind, established_on, vesting_on, balance_month, resolve_by, majority_allowed, distributes, family_trust_election_on, tax_ref, deed_held_at, note)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [code, text(f.name), fam.id, j, f.kind ? oneOf(String(f.kind), TRUST_KINDS, 'kind') : 'discretionary', est, vest, bm, text(f['resolve-by']), flag(f.majority),
        f.accumulates ? false : true, f.fte ? date(f.fte, 'fte') : null, text(f['tax-ref']), text(f['held-at']), text(f.note)]);
      await log(db, actor, 'add-trust', code, `${text(f.name)} (${j}, established ${est})`);
      const [t] = await db.query('select code, name, jurisdiction, established_on, vests_on, balance_month from v_trusts where code = $1', [code]);
      return { ...t, next: 'Add the people with /appoint, then the deed with /add-document' };
    });
  },
  async 'add-person'(db, [code], f) {
    const actor = actorOf(f);
    need(f, 'name');
    const c = String(code || '').toUpperCase();
    if (!/^[A-Z0-9-]{2,20}$/.test(c)) throw Error('Usage: add-person <CODE> --name="..." [--kind=individual|company|trust|charity] [--dob=YYYY-MM-DD]');
    const kind = f.kind ? oneOf(String(f.kind), PERSON_KINDS, 'kind') : 'individual';
    if (f.dob && kind !== 'individual') throw Error('Only an individual has a date of birth');
    return tx(db, async () => {
      await db.query('insert into people (code, name, kind, dob, email, phone, address, tfn_quoted) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [c, text(f.name), kind, f.dob ? pastDate(f.dob, 'dob') : null, text(f.email), text(f.phone), text(f.address), flag(f.tfn)]);
      await log(db, actor, 'add-person', c, text(f.name));
      return { person: c, name: text(f.name), kind };
    });
  },
  // Give a person a role in a trust. A new trustee needs the appointment recorded and the beneficiaries told.
  async appoint(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    need(f, 'role');
    const t = await trust(db, tTerm);
    activeTrust(t);
    const p = await person(db, pTerm);
    const role = oneOf(String(f.role), ROLES, 'role');
    const from = f.from ? pastDate(f.from, 'from') : today();
    if (from < iso(t.established_on)) throw Error(`--from is before ${t.code} was established (${iso(t.established_on)})`);
    if (await roleOf(db, t, p, role)) throw Error(`${p.name} is already a current ${role} of ${t.code}`);
    if (role === 'trustee' && p.kind === 'individual' && p.dob && new Date(`${iso(p.dob)}T00:00:00Z`) > new Date(Date.now() - 18 * 365.25 * 86400000)) throw Error(`${p.name} is under 18 and cannot be a trustee`);
    const inGroup = f['outside-family'] ? false : true;
    if (!inGroup && t.jurisdiction !== 'AU') throw Error('--outside-family applies to an Australian trust with a family trust election');
    return tx(db, async () => {
      await db.query('insert into roles (trust_id, person_id, role, from_on, in_family_group, note) values ($1,$2,$3,$4,$5,$6)', [t.id, p.id, role, from, inGroup, text(f.note)]);
      await log(db, actor, 'appoint', t.code, `${p.name} as ${role} from ${from}`);
      const next = role === 'trustee'
        ? ['File the deed of appointment: /add-document ' + t.code + ' --kind=appointment --person=' + p.code, 'Give the new trustee a copy of the deed: /copy-held',
          ...(t.jurisdiction === 'NZ' ? ['Tell the beneficiaries within ' + (await setting(db, 'notice_days', 30)) + ' days: /notify ' + t.code + ' --kind=trustee-change --trustee=' + p.code] : [])]
        : [];
      return { trust: t.code, person: p.name, role, from, next };
    });
  },
  // End a role. A departing trustee hands the documents to a continuing trustee (s 48).
  async retire(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    need(f, 'role');
    const t = await trust(db, tTerm);
    const p = await person(db, pTerm);
    const role = oneOf(String(f.role), ROLES, 'role');
    const r = await roleOf(db, t, p, role);
    if (!r) throw Error(`${p.name} is not a current ${role} of ${t.code}`);
    const to = f.to ? pastDate(f.to, 'to') : today();
    if (to < iso(r.from_on)) throw Error(`--to is before ${p.name} became ${role} (${iso(r.from_on)})`);
    if (role === 'trustee') {
      const left = await db.query(`select 1 from roles where trust_id = $1 and role = 'trustee' and to_on is null and id <> $2`, [t.id, r.id]);
      if (!left.length && t.status === 'active') throw Error(`${p.name} is the last trustee of ${t.code}: appoint a replacement first`);
    }
    const passed = f['docs-passed'] ? date(f['docs-passed'], 'docs-passed') : null;
    if (passed && role !== 'trustee') throw Error('--docs-passed is for a retiring trustee');
    return tx(db, async () => {
      await db.query('update roles set to_on = $2, docs_passed_on = $3, note = coalesce($4, note) where id = $1', [r.id, to, passed, text(f.note)]);
      await log(db, actor, 'retire', t.code, `${p.name} ends as ${role} on ${to}`);
      return { trust: t.code, person: p.name, role, to,
        next: role === 'trustee' ? [passed ? null : `Record the handover of documents: /docs-passed ${t.code} ${p.code}`, `File the deed of retirement: /add-document ${t.code} --kind=retirement --person=${p.code}`,
          t.jurisdiction === 'NZ' ? `Tell the beneficiaries: /notify ${t.code} --kind=trustee-change --trustee=${p.code}` : null].filter(Boolean) : [] };
    });
  },
  async 'docs-passed'(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    const t = await trust(db, tTerm);
    const p = await person(db, pTerm);
    const [r] = await db.query(`select * from roles where trust_id = $1 and person_id = $2 and role = 'trustee' and to_on is not null order by to_on desc limit 1`, [t.id, p.id]);
    if (!r) throw Error(`${p.name} has not retired as a trustee of ${t.code}`);
    if (r.docs_passed_on) throw Error(`Already recorded: documents passed on ${iso(r.docs_passed_on)}`);
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      await db.query('update roles set docs_passed_on = $2 where id = $1', [r.id, on]);
      await log(db, actor, 'docs-passed', t.code, `${p.name} handed over the trust documents on ${on}`);
      return { trust: t.code, trustee: p.name, docs_passed_on: on, on_time: on <= iso(r.to_on) };
    });
  },
  async 'add-asset'(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'description', 'kind');
    const t = await trust(db, tTerm);
    activeTrust(t);
    const kind = oneOf(String(f.kind), ASSET_KINDS, 'kind');
    return tx(db, async () => {
      const ref = await nextRef(db, 'assets', `AST-${t.code}-`, 1);
      const value = f.value ? cents(f.value, 'value') : null;
      await db.query('insert into assets (ref, trust_id, description, kind, acquired_on, cost_cents, value_cents, valued_on, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [ref, t.id, text(f.description), kind, f.acquired ? pastDate(f.acquired, 'acquired') : null, f.cost ? cents(f.cost, 'cost') : null, value, value === null ? null : f.valued ? pastDate(f.valued, 'valued') : today(), text(f.note)]);
      await log(db, actor, 'add-asset', ref, `${t.code}: ${text(f.description)}`);
      return setFrom(t, null, { ref, trust: t.code, description: text(f.description), value_cents: value });
    });
  },
  async value(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'value');
    const a = await asset(db, term);
    if (a.disposed_on) throw Error(`${a.ref} was disposed of on ${iso(a.disposed_on)}`);
    const v = cents(f.value, 'value');
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      await db.query('update assets set value_cents = $2, valued_on = $3, note = coalesce($4, note) where id = $1', [a.id, v, on, text(f.note)]);
      await log(db, actor, 'value', a.ref, `${money(v, cur(a.jurisdiction))} on ${on}${text(f.note) ? ` (${text(f.note)})` : ''}`);
      return { ref: a.ref, description: a.description, was_cents: a.value_cents, now_cents: v, currency: cur(a.jurisdiction), valued_on: on };
    });
  },
  async dispose(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'on');
    const a = await asset(db, term);
    if (a.disposed_on) throw Error(`${a.ref} was already disposed of on ${iso(a.disposed_on)}`);
    const on = pastDate(f.on, 'on');
    return tx(db, async () => {
      await db.query('update assets set disposed_on = $2, disposal_cents = $3, note = coalesce($4, note) where id = $1', [a.id, on, f.proceeds ? cents(f.proceeds, 'proceeds') : null, text(f.note)]);
      await log(db, actor, 'dispose', a.ref, `${a.description} disposed of on ${on}`);
      return { ref: a.ref, disposed_on: on, proceeds_cents: f.proceeds ? cents(f.proceeds, 'proceeds') : null, currency: cur(a.jurisdiction) };
    });
  },
  // Open a loan to or from the trust, with its first advance.
  async lend(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    need(f, 'amount');
    const t = await trust(db, tTerm);
    activeTrust(t);
    const p = await person(db, pTerm);
    const on = f.on ? pastDate(f.on, 'on') : today();
    const direction = f['owed-to-trust'] ? 'owed-to-trust' : 'owed-by-trust';
    return tx(db, async () => {
      const ref = await nextRef(db, 'loans', `LN-${t.code}-`, 1);
      const [l] = await db.query('insert into loans (ref, trust_id, person_id, direction, opened_on, terms) values ($1,$2,$3,$4,$5,$6) returning id', [ref, t.id, p.id, direction, on, text(f.terms)]);
      await db.query(`insert into loan_movements (loan_id, kind, on_date, amount_cents, note) values ($1, 'advance', $2, $3, $4)`, [l.id, on, cents(f.amount, 'amount'), text(f.note)]);
      await log(db, actor, 'lend', ref, `${p.name} ${direction === 'owed-by-trust' ? 'lent the trust' : 'borrowed from the trust'} ${money(cents(f.amount, 'amount'), t.currency)}`);
      return { ref, trust: t.code, with: p.name, direction, amount_cents: cents(f.amount, 'amount'), currency: t.currency, next: `File the loan agreement: /add-document ${t.code} --kind=loan-agreement` };
    });
  },
  // A repayment or a forgiveness (a gift) on a loan. Never more than the balance.
  async repay(db, [term], f) { return loanMove(db, term, f, 'repayment'); },
  async forgive(db, [term], f) { return loanMove(db, term, f, 'forgiven'); },
  // Record a trustee resolution and who signed it. Each signer must be a trustee in office that day.
  async resolve(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'kind', 'summary');
    const t = await trust(db, tTerm);
    activeTrust(t);
    const kind = oneOf(String(f.kind), RES_KINDS, 'kind');
    const made = f.on ? pastDate(f.on, 'on') : today();
    const year = f.year ? num(f.year, 'year', { min: 1990, max: 2200 }) : null;
    if (kind === 'distribution' && !year) throw Error('A distribution resolution needs --year: the income year it is for (named for the year it ends in)');
    const inOffice = await trusteesOn(db, t.id, made);
    if (!inOffice.length) throw Error(`${t.code} had no trustee in office on ${made}`);
    const signers = f.signed ? String(f.signed).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const ids = [];
    for (const s of signers) {
      const p = await person(db, s);
      if (!inOffice.some((x) => x.id === p.id)) throw Error(`${p.name} was not a trustee of ${t.code} on ${made}: only a trustee in office signs`);
      if (!ids.includes(p.id)) ids.push(p.id);
    }
    return tx(db, async () => {
      const ref = await nextRef(db, 'resolutions', `RES-${t.code}-`, 3);
      await db.query('insert into resolutions (ref, trust_id, made_on, kind, income_year, summary) values ($1,$2,$3,$4,$5,$6)', [ref, t.id, made, kind, year, text(f.summary)]);
      const [x] = await db.query('select id from resolutions where ref = $1', [ref]);
      for (const id of ids) await db.query('insert into resolution_signers (resolution_id, person_id, signed_on) values ($1,$2,$3)', [x.id, id, made]);
      await log(db, actor, 'resolve', t.code, `${ref} ${kind}: ${text(f.summary)}`);
      const missing = inOffice.filter((p) => !ids.includes(p.id)).map((p) => p.name);
      const enough = !missing.length || (t.majority_allowed && ids.length * 2 > inOffice.length);
      return { ref, trust: t.code, made_on: made, kind, income_year: year, signed: `${ids.length} of ${inOffice.length}`,
        warning: enough ? null : `Not yet valid: ${missing.join(', ')} must sign (${t.jurisdiction === 'NZ' && !t.majority_allowed ? 'Trusts Act 2019 s 38: trustees act unanimously' : 'the deed'}). Record it with /sign ${ref} --by=<name>`,
        ...(kind === 'distribution' ? { next: `Record each beneficiary's share: /distribute ${ref} <beneficiary> --amount=... or --share=...` } : {}) };
    });
  },
  async sign(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'by');
    const r = await resolution(db, term);
    const p = await person(db, f.by);
    const inOffice = await trusteesOn(db, r.trust_id, iso(r.made_on));
    if (!inOffice.some((x) => x.id === p.id)) throw Error(`${p.name} was not a trustee of ${r.trust} on ${iso(r.made_on)}`);
    if ((await db.query('select 1 from resolution_signers where resolution_id = $1 and person_id = $2', [r.id, p.id])).length) throw Error(`${p.name} has already signed ${r.ref}`);
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      await db.query('insert into resolution_signers (resolution_id, person_id, signed_on) values ($1,$2,$3)', [r.id, p.id, on]);
      await log(db, actor, 'sign', r.ref, `${p.name} signed on ${on}`);
      const [after] = await db.query('select signed, trustees_then, unsigned_by from v_resolutions where id = $1', [r.id]);
      return { ref: r.ref, signed_by: p.name, signed: `${after.signed} of ${after.trustees_then}`, still_to_sign: after.unsigned_by || null };
    });
  },
  // A beneficiary's share under a distribution resolution: a fixed amount or a percentage.
  async distribute(db, [rTerm, pTerm], f) {
    const actor = actorOf(f);
    const r = await resolution(db, rTerm);
    if (r.kind !== 'distribution') throw Error(`${r.ref} is a ${r.kind} resolution, not a distribution`);
    const p = await person(db, pTerm);
    const [b] = await db.query(`select * from roles where trust_id = $1 and person_id = $2 and role in ('beneficiary', 'default-beneficiary')
      and from_on <= $3 and (to_on is null or to_on >= $3)`, [r.trust_id, p.id, iso(r.made_on)]);
    if (!b) throw Error(`${p.name} was not a beneficiary of ${r.trust} on ${iso(r.made_on)}: check the deed and the register`);
    if (!f.amount && !f.share) throw Error('Give --amount=<dollars> or --share=<percent>');
    const kind = f.kind ? oneOf(String(f.kind), DIST_KINDS, 'kind') : 'income';
    if (['franked', 'capital-gain'].includes(kind) && r.jurisdiction !== 'AU') throw Error(`${kind} streaming is an Australian rule`);
    const amount = f.amount ? cents(f.amount, 'amount') : null;
    const share = f.share ? num(f.share, 'share', { min: 0.001, max: 100 }) : null;
    if (share) {
      const [s] = await db.query(`select coalesce(sum(share_pct), 0)::numeric as pct from distributions where resolution_id = $1 and kind = $2`, [r.id, kind]);
      if (Number(s.pct) + share > 100) throw Error(`Shares of ${kind} on ${r.ref} would come to ${Number(s.pct) + share}%: more than 100%`);
    }
    const warnings = [];
    if (r.jurisdiction === 'NZ' && kind === 'income' && p.dob) {
      const [m] = await db.query('select year_end($1::int, t.balance_month) as ye from trusts t where t.id = $2', [r.income_year, r.trust_id]);
      const ye = new Date(`${iso(m.ye)}T00:00:00Z`);
      const sixteen = new Date(`${iso(p.dob)}T00:00:00Z`); sixteen.setUTCFullYear(sixteen.getUTCFullYear() + 16);
      if (sixteen > ye && (amount ?? 0) > 100000) warnings.push(`${p.name} is under 16 at year end: beneficiary income over $1,000 is taxed at the trustee rate (Income Tax Act 2007 s HC 35)`);
    }
    if (r.jurisdiction === 'AU' && !b.in_family_group) {
      const [t] = await db.query('select family_trust_election_on from trusts where id = $1', [r.trust_id]);
      if (t.family_trust_election_on) warnings.push(`${p.name} is outside the family group of a trust with a family trust election: family trust distribution tax applies (ITAA 1936 Sch 2F s 271-15)`);
    }
    if (r.jurisdiction === 'AU' && !p.tfn_quoted) warnings.push(`${p.name} has not quoted a TFN: withhold at the top rate from any payment`);
    return tx(db, async () => {
      const ref = await nextRef(db, 'distributions', `DST-${r.trust}-${r.income_year}-`, 1);
      await db.query(`insert into distributions (ref, trust_id, resolution_id, person_id, income_year, kind, amount_cents, share_pct, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ref, r.trust_id, r.id, p.id, r.income_year, kind, amount, share, text(f.note)]);
      await log(db, actor, 'distribute', r.trust, `${ref}: ${p.name} ${kind} ${amount !== null ? money(amount, cur(r.jurisdiction)) : `${share}%`} for ${r.income_year}`);
      return { ref, resolution: r.ref, beneficiary: p.name, kind, income_year: r.income_year, amount_cents: amount, share_pct: share, currency: cur(r.jurisdiction), warnings };
    });
  },
  // Money paid out on a distribution (to the beneficiary, or to someone else on their behalf).
  async paid(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'amount');
    const d = await distribution(db, term);
    const amt = cents(f.amount, 'amount');
    if (d.amount_cents !== null && d.paid_cents + amt > d.amount_cents) throw Error(`That would pay ${money(d.paid_cents + amt, cur(d.jurisdiction))} on an entitlement of ${money(d.amount_cents, cur(d.jurisdiction))}`);
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      await db.query('update distributions set paid_cents = paid_cents + $2, paid_on = $3, paid_to = coalesce($4, paid_to) where id = $1', [d.id, amt, on, text(f.to)]);
      await log(db, actor, 'paid', d.ref, `${money(amt, cur(d.jurisdiction))} on ${on}${text(f.to) ? ` to ${text(f.to)}` : ''}`);
      return { ref: d.ref, paid_cents: d.paid_cents + amt, entitled_cents: d.amount_cents, currency: cur(d.jurisdiction), paid_to: text(f.to) || d.paid_to || null };
    });
  },
  // Australia: an unpaid entitlement to a company beneficiary put on a complying loan agreement.
  async 'upe-loan'(db, [term], f) {
    const actor = actorOf(f);
    const d = await distribution(db, term);
    if (d.jurisdiction !== 'AU') throw Error('Unpaid present entitlements and Division 7A are Australian rules');
    const [p] = await db.query('select kind, name from people where id = $1', [d.person_id]);
    if (p.kind !== 'company') throw Error(`${p.name} is not a company beneficiary`);
    return tx(db, async () => {
      await db.query('update distributions set upe_loan = true, note = coalesce($2, note) where id = $1', [d.id, text(f.note)]);
      await log(db, actor, 'upe-loan', d.ref, `${p.name}'s unpaid entitlement put on a complying loan`);
      return { ref: d.ref, beneficiary: p.name, upe_loan: true, next: `File the loan agreement: /add-document ${d.trust} --kind=loan-agreement` };
    });
  },
  async 'add-document'(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'kind', 'title');
    const t = await trust(db, tTerm);
    const kind = oneOf(String(f.kind), DOC_KINDS, 'kind');
    const p = f.person ? await person(db, f.person) : null;
    if (['appointment', 'retirement'].includes(kind) && !p) throw Error(`A ${kind} document needs --person: the trustee it is about`);
    const year = f.year ? num(f.year, 'year', { min: 1990, max: 2200 }) : null;
    if (kind === 'financial-statements' && !year) throw Error('Financial statements need --year: the income year they cover');
    return tx(db, async () => {
      const ref = await nextRef(db, 'documents', `DOC-${t.code}-`, 3);
      await db.query('insert into documents (ref, trust_id, kind, title, dated, income_year, person_id, held_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [ref, t.id, kind, text(f.title), f.dated ? pastDate(f.dated, 'dated') : today(), year, p?.id ?? null, text(f['held-at'])]);
      await log(db, actor, 'add-document', ref, `${t.code}: ${kind}, ${text(f.title)}`);
      return { ref, trust: t.code, kind, title: text(f.title), next: ['deed', 'variation'].includes(kind) ? `Record which trustees hold a copy: /copy-held ${ref} --by=<trustee>` : null };
    });
  },
  async 'copy-held'(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'by');
    const d = await document(db, term);
    const p = await person(db, f.by);
    const since = f.since ? pastDate(f.since, 'since') : today();
    return tx(db, async () => {
      const r = await db.query('insert into document_copies (document_id, person_id, since) values ($1,$2,$3) on conflict do nothing returning 1', [d.id, p.id, since]);
      if (!r.length) throw Error(`${p.name} already holds a copy of ${d.ref}`);
      await log(db, actor, 'copy-held', d.ref, `${p.name} holds a copy since ${since}`);
      return { ref: d.ref, title: d.title, held_by: p.name, since };
    });
  },
  // Basic trust information given (to one beneficiary, or every beneficiary when no --to), a trustee
  // change notified, or a decision to withhold with the s 53 factors recorded.
  async notify(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'kind');
    const t = await trust(db, tTerm);
    const kind = oneOf(String(f.kind), ['basic-info', 'trustee-change'], 'kind');
    const p = f.to ? await person(db, f.to) : null;
    if (p) {
      const b = await db.query(`select 1 from roles where trust_id = $1 and person_id = $2 and role in ('beneficiary', 'default-beneficiary')`, [t.id, p.id]);
      if (!b.length) throw Error(`${p.name} is not a beneficiary of ${t.code}`);
    }
    let roleId = null;
    if (kind === 'trustee-change') {
      need(f, 'trustee');
      const tp = await person(db, f.trustee);
      const [r] = await db.query(`select id from roles where trust_id = $1 and person_id = $2 and role = 'trustee' order by coalesce(to_on, from_on) desc limit 1`, [t.id, tp.id]);
      if (!r) throw Error(`${tp.name} has never been a trustee of ${t.code}`);
      roleId = r.id;
    }
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      const ref = await nextRef(db, 'notices', `NTC-${t.code}-`, 1);
      await db.query('insert into notices (ref, trust_id, person_id, kind, role_id, given_on, reason) values ($1,$2,$3,$4,$5,$6,$7)', [ref, t.id, p?.id ?? null, kind, roleId, on, text(f.note)]);
      await log(db, actor, 'notify', t.code, `${ref}: ${kind} to ${p?.name || 'every beneficiary'} on ${on}`);
      return { ref, trust: t.code, kind, to: p?.name || 'every beneficiary', given_on: on };
    });
  },
  async withhold(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const t = await trust(db, tTerm);
    const p = await person(db, pTerm);
    const b = await db.query(`select 1 from roles where trust_id = $1 and person_id = $2 and role in ('beneficiary', 'default-beneficiary') and to_on is null`, [t.id, p.id]);
    if (!b.length) throw Error(`${p.name} is not a current beneficiary of ${t.code}`);
    if (String(f.reason).trim().length < 20) throw Error('--reason must say which section 53 factors the trustees weighed, in a sentence or two');
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      const ref = await nextRef(db, 'notices', `NTC-${t.code}-`, 1);
      await db.query(`insert into notices (ref, trust_id, person_id, kind, given_on, reason) values ($1,$2,$3,'withheld',$4,$5)`, [ref, t.id, p.id, on, text(f.reason)]);
      await log(db, actor, 'withhold', t.code, `${ref}: basic information withheld from ${p.name}`);
      return { ref, trust: t.code, beneficiary: p.name, decided_on: on, reason: text(f.reason), next: `Minute it: /resolve ${t.code} --kind=information --summary="..."` };
    });
  },
  async request(db, [tTerm, pTerm], f) {
    const actor = actorOf(f);
    need(f, 'what');
    const t = await trust(db, tTerm);
    const p = await person(db, pTerm);
    const b = await db.query(`select 1 from roles where trust_id = $1 and person_id = $2 and role in ('beneficiary', 'default-beneficiary')`, [t.id, p.id]);
    if (!b.length) throw Error(`${p.name} is not a beneficiary of ${t.code}`);
    const rec = f.received ? pastDate(f.received, 'received') : today();
    return tx(db, async () => {
      const ref = await nextRef(db, 'info_requests', 'REQ-', 4);
      await db.query('insert into info_requests (ref, trust_id, person_id, received_on, asked_for) values ($1,$2,$3,$4,$5)', [ref, t.id, p.id, rec, text(f.what)]);
      await log(db, actor, 'request', ref, `${p.name} asked ${t.code} for: ${text(f.what)}`);
      const days = await setting(db, 'request_days', 20);
      const due = new Date(Date.parse(`${rec}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
      return { ref, trust: t.code, beneficiary: p.name, received_on: rec, due_on: due, rule: t.jurisdiction === 'NZ' ? 'Trusts Act 2019 s 52: within a reasonable period, after weighing the s 53 factors' : 'The deed and the house rule' };
    });
  },
  async answer(db, [term], f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const q = await request(db, term);
    if (q.answered_on) throw Error(`${q.ref} was answered on ${iso(q.answered_on)}`);
    const outcome = oneOf(String(f.outcome), ['given', 'part', 'refused'], 'outcome');
    if (outcome !== 'given' && !text(f.reason)) throw Error('A refusal or part answer needs --reason: the section 53 factors the trustees weighed');
    const on = f.on ? pastDate(f.on, 'on') : today();
    if (on < iso(q.received_on)) throw Error('--on is before the request was received');
    return tx(db, async () => {
      await db.query('update info_requests set answered_on = $2, outcome = $3, reason = $4 where id = $1', [q.id, on, outcome, text(f.reason)]);
      await log(db, actor, 'answer', q.ref, `${outcome} on ${on}`);
      const days = await setting(db, 'request_days', 20);
      const taken = Math.round((Date.parse(`${on}T00:00:00Z`) - Date.parse(`${iso(q.received_on)}T00:00:00Z`)) / 86400000);
      return { ref: q.ref, outcome, answered_on: on, days_taken: taken, within_house_rule: taken <= days };
    });
  },
  async 'tfn-quoted'(db, [pTerm], f) {
    const actor = actorOf(f);
    const p = await person(db, pTerm);
    if (p.tfn_quoted) throw Error(`${p.name} has already quoted a TFN`);
    return tx(db, async () => {
      await db.query('update people set tfn_quoted = true where id = $1', [p.id]);
      await log(db, actor, 'tfn-quoted', p.code, `${p.name} quoted a TFN to the trustee (the number itself is not stored here)`);
      return { person: p.name, tfn_quoted: true };
    });
  },
  async 'wind-up'(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'on');
    const t = await trust(db, tTerm);
    activeTrust(t);
    const on = pastDate(f.on, 'on');
    const held = await db.query('select ref, description from assets where trust_id = $1 and disposed_on is null', [t.id]);
    if (held.length && !f.force) throw Error(`${t.code} still holds ${held.map((a) => `${a.ref} ${a.description}`).join('; ')}. Record the disposal or distribution first, or pass --force`);
    const owing = await db.query('select ref, balance_cents from v_loans where trust_id = $1 and balance_cents <> 0', [t.id]);
    if (owing.length && !f.force) throw Error(`Loans still open: ${owing.map((l) => `${l.ref} ${money(l.balance_cents, t.currency)}`).join('; ')}. Repay or forgive them first, or pass --force`);
    return tx(db, async () => {
      await db.query(`update trusts set status = 'wound-up', wound_up_on = $2 where id = $1`, [t.id, on]);
      await db.query(`update roles set to_on = $2 where trust_id = $1 and to_on is null`, [t.id, on]);
      await log(db, actor, 'wind-up', t.code, `${t.name} wound up on ${on}`);
      return { trust: t.code, wound_up_on: on, next: 'Keep the records: they are not deleted. File the final resolution with /add-document --kind=minutes' };
    });
  },
  async 'add-action'(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'what', 'due');
    const t = tTerm ? await trust(db, tTerm) : null;
    return tx(db, async () => {
      const ref = await nextRef(db, 'actions', 'ACT-', 4);
      await db.query('insert into actions (ref, trust_id, what, owner, due_on) values ($1,$2,$3,$4,$5)', [ref, t?.id ?? null, text(f.what), text(f.owner), date(f.due, 'due')]);
      await log(db, actor, 'add-action', ref, text(f.what));
      return { ref, trust: t?.code ?? null, what: text(f.what), due_on: date(f.due, 'due') };
    });
  },
  async 'close-action'(db, [term], f) {
    const actor = actorOf(f);
    const a = await action(db, term);
    if (a.done_on) throw Error(`${a.ref} was closed on ${iso(a.done_on)}`);
    const on = f.on ? pastDate(f.on, 'on') : today();
    return tx(db, async () => {
      await db.query('update actions set done_on = $2, outcome = $3 where id = $1', [a.id, on, text(f.outcome)]);
      await log(db, actor, 'close-action', a.ref, text(f.outcome) || 'done');
      return { ref: a.ref, what: a.what, done_on: on };
    });
  },
  async note(db, [tTerm], f) {
    const actor = actorOf(f);
    need(f, 'text');
    const t = await trust(db, tTerm);
    const kind = f.kind ? oneOf(String(f.kind), NOTE_KINDS, 'kind') : 'note';
    return tx(db, async () => {
      await db.query('insert into notes (trust_id, kind, body, actor) values ($1,$2,$3,$4)', [t.id, kind, text(f.text), actor]);
      await log(db, actor, 'note', t.code, `${kind}: ${text(f.text).slice(0, 80)}`);
      return { trust: t.code, kind, text: text(f.text) };
    });
  },
  async set(db, [key, value], f) {
    const actor = actorOf(f);
    if (!key || value === undefined) throw Error('Usage: set <key> <value>');
    if (!/^[a-z0-9_]+$/.test(key)) throw Error('Setting keys are lowercase words joined by _');
    num(value, key, { min: 0 });
    return tx(db, async () => {
      await db.query(`insert into settings (key, value, note) values ($1, $2, $3) on conflict (key) do update set value = excluded.value, note = coalesce(excluded.note, settings.note)`, [key, String(value), text(f.note)]);
      await log(db, actor, 'set', key, String(value));
      return { key, value: String(value) };
    });
  },
};

async function loanMove(db, term, f, kind) {
  const actor = actorOf(f);
  need(f, 'amount');
  const l = await loan(db, term);
  const amt = cents(f.amount, 'amount');
  if (amt > l.balance_cents) throw Error(`${l.ref} has ${money(l.balance_cents, l.currency)} outstanding: ${kind === 'forgiven' ? 'forgive' : 'repay'} no more than that`);
  const on = f.on ? pastDate(f.on, 'on') : today();
  const res = f.resolution ? await resolution(db, f.resolution) : null;
  if (kind === 'forgiven' && l.direction === 'owed-by-trust' && !res) throw Error('Forgiving a loan is a gift to the trust: name the resolution or deed that records it with --resolution (record one with /resolve --kind=gift)');
  return tx(db, async () => {
    await db.query('insert into loan_movements (loan_id, kind, on_date, amount_cents, resolution_id, note) values ($1,$2,$3,$4,$5,$6)', [l.id, kind, on, amt, res?.id ?? null, text(f.note)]);
    await log(db, actor, kind === 'forgiven' ? 'forgive' : 'repay', l.ref, `${money(amt, l.currency)} ${kind} on ${on}`);
    return { ref: l.ref, lender: l.lender, [kind === 'forgiven' ? 'forgiven_cents' : 'repaid_cents']: amt, balance_cents: l.balance_cents - amt, currency: l.currency };
  });
}

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const fmtDate = (d) => (d ? new Date(`${iso(d)}T00:00:00Z`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const amountOf = (d, c) => (d.amount_cents !== null && d.amount_cents !== undefined ? money(d.amount_cents, c) : `${Number(d.share_pct)}% of the net income`);

export const drafts = {
  async 'weekly-review'(db) {
    const att = await reads.attention(db);
    const ye = await reads['year-end'](db, [], {});
    const reqs = await reads.requests(db, [], { open: true });
    const lines = [`# Weekly trust review, ${fmtDate(today())}`, '',
      `## Needs a person (${att.length})`, '', ...(att.length ? att.map((r) => `- **${r.item}** ${r.ref}: ${r.detail}`) : ['- Nothing.']), '',
      `## Year end, last finished year`, '', '| Trust | Year | Balance date | Resolution | Distributions | Accounts |', '|---|---|---|---|---|---|',
      ...ye.map((y) => `| ${y.trust} | ${y.income_year} | ${iso(y.balance_date)} | ${y.resolution || ''}${y.resolved_on ? ` (${iso(y.resolved_on)})` : ''} | ${y.distributions} | ${y.accounts || ''} |`), '',
      `## Beneficiary requests waiting (${reqs.length})`, '', ...(reqs.length ? reqs.map((q) => `- ${q.ref} ${q.trust}: ${q.beneficiary} asked for ${q.asked_for} on ${iso(q.received_on)}, due ${iso(q.due_on)}`) : ['- None.']), '',
      'Drafted from the trust records. Check each line before acting on it.'];
    return { file: draftFile(`weekly-review-${today()}.md`, lines.join('\n') + '\n'), items: att.length, trusts: ye.length };
  },
  // The year-end distribution resolution for a trust, ready for the trustees to sign.
  async 'draft-resolution'(db, [term], f) {
    const t = await trust(db, term);
    activeTrust(t);
    // New Zealand allocates after balance date (within 6 months); Australia resolves before it.
    const year = f.year ? num(f.year, 'year', { min: 1990, max: 2200 }) : t.jurisdiction === 'AU' ? t.current_year : t.last_year;
    const [ye] = await db.query('select year_end($1::int, $2::int) as d', [year, t.balance_month]);
    const trustees = await trusteesOn(db, t.id, today());
    const bens = await db.query(`select p.name, r.role, p.kind, p.dob, r.in_family_group from roles r join people p on p.id = r.person_id
      where r.trust_id = $1 and r.role in ('beneficiary', 'default-beneficiary') and r.to_on is null order by r.role, p.name`, [t.id]);
    const prior = await db.query(`select p.name, d.kind, d.amount_cents, d.share_pct from distributions d join people p on p.id = d.person_id where d.trust_id = $1 and d.income_year = $2 order by d.ref`, [t.id, year - 1]);
    const due = t.jurisdiction === 'AU' ? (t.resolve_by ? `${year}-${t.resolve_by}` : iso(ye.d)) : iso(new Date(Date.parse(`${iso(ye.d)}T00:00:00Z`) + 183 * 86400000));
    const body = [`# ${t.name}`, `## Resolution of the trustees: distribution of income for the year ended ${fmtDate(ye.d)}`, '',
      `**Trustees:** ${trustees.map((x) => x.name).join(', ')}  `, `**Made on:** [date, no later than ${fmtDate(due)}]  `, '',
      'The trustees, having considered the terms of the trust deed, the needs of the beneficiaries and the memorandum of wishes, resolve:', '',
      t.jurisdiction === 'AU'
        ? `1. That the net income of the trust for the year ended ${fmtDate(ye.d)}, as defined in the deed, be distributed to the beneficiaries below, who are presently entitled to it from the date of this resolution.`
        : `1. That the income of the trust for the year ended ${fmtDate(ye.d)} be applied to the beneficiaries below as beneficiary income, by vesting it in them absolutely or paying it to them.`,
      '', '| Beneficiary | Share or amount | Kind |', '|---|---|---|',
      ...bens.map((b) => `| ${b.name} | [amount or %] | income |`), '',
      '2. That any amount vested and not paid be credited to the beneficiary\'s current account and paid on demand.', '',
      ...(t.jurisdiction === 'AU' ? ['3. [If streaming] That the capital gain of $[amount] and franked distributions of $[amount] be streamed as set out above, each beneficiary being specifically entitled to them.', ''] : []),
      ...(prior.length ? ['Last year, for reference:', '', ...prior.map((p) => `- ${p.name}: ${p.kind} ${amountOf(p, t.currency)}`), ''] : []),
      'Signed by every trustee:', '', ...trustees.map((x) => `- ${x.name} ______________________ Date ________`), '',
      `<!-- Draft. Before signing check: ${t.jurisdiction === 'AU' ? `the deed's definition of income and its resolution date (${t.resolve_by || '30 June'}), streaming wording, the family trust election${t.family_trust_election_on ? ' (made: keep distributions inside the family group)' : ''}, and s 100A` : 'the six-month window under HC 6(1B), and any beneficiary under 16 (HC 35)'}.`,
      `When signed: /resolve ${t.code} --kind=distribution --year=${year} --on=<date> --signed="${trustees.map((x) => x.name).join(', ')}" --summary="..." then /distribute for each line. -->`];
    return { file: draftFile(`distribution-resolution-${t.code}-${year}.md`, body.join('\n') + '\n'), trust: t.code, income_year: year, due_by: due, beneficiaries: bens.length };
  },
  // Minutes for the annual review: deed, people, assets, loans, last year's distributions, what is open.
  async 'draft-minutes'(db, [term]) {
    const t = await trust(db, term);
    const detail = await reads.trust(db, [t.code]);
    const obligations = detail.obligations.filter((o) => ['overdue', 'due soon', 'open'].includes(o.standing));
    const body = [`# ${t.name}`, `## Minutes of the annual review of the trustees`, '', `**Date:** [date]  `, `**Present:** ${t.trustee_names || '[trustees]'}  `, `**Also present:** [adviser]  `, '',
      '### 1. The trust deed', `The trustees confirmed they have read the deed${t.vests_on ? ` and noted that the trust vests on ${fmtDate(t.vests_on)}` : ''}, and the memorandum of wishes if there is one.`, '',
      '### 2. The people', ...detail.people.filter((p) => !p.to_on).map((p) => `- ${p.name}: ${p.role}`), '',
      '### 3. Trust property', ...(detail.assets.length ? detail.assets.map((a) => `- ${a.description}: ${a.value_cents !== null ? money(a.value_cents, t.currency) : 'value not recorded'}${a.valued_on ? ` (valued ${fmtDate(a.valued_on)})` : ''}`) : ['- None recorded.']), '',
      '### 4. Loans', ...(detail.loans.length ? detail.loans.map((l) => `- ${l.ref} ${l.lender}: ${money(l.balance_cents, l.currency)} ${l.direction === 'owed-by-trust' ? 'owed by the trust' : 'owed to the trust'}`) : ['- None.']), '',
      '### 5. Matters to decide', ...(obligations.length ? obligations.map((o) => `- ${o.item}${o.ref ? ` (${o.ref})` : ''}: due ${fmtDate(o.due_on)}, ${o.standing}`) : ['- Nothing outstanding.']), '- [Investment strategy, insurance, the needs of the beneficiaries, gifting, information to beneficiaries]', '',
      '### 6. Resolutions', '[Each decision, in one sentence.]', '', 'Signed by every trustee:', '', ...(t.trustee_names || '').split(', ').filter(Boolean).map((n) => `- ${n} ______________________`), '',
      `<!-- Draft. When signed: /resolve ${t.code} --kind=annual-review --on=<date> --signed="${t.trustee_names}" --summary="..." -->`];
    return { file: draftFile(`annual-review-${t.code}-${today()}.md`, body.join('\n') + '\n'), trust: t.code, open_items: obligations.length };
  },
  // The basic trust information letter (Trusts Act 2019 s 51(3)), or the trustee change letter.
  async 'draft-beneficiary-notice'(db, [tTerm, pTerm], f) {
    const t = await trust(db, tTerm);
    if (t.jurisdiction !== 'NZ') throw Error('The basic trust information letter follows the Trusts Act 2019 (New Zealand)');
    const p = pTerm ? await person(db, pTerm) : null;
    const trustees = await db.query(`select p.name, p.email, p.phone, p.address from roles r join people p on p.id = r.person_id where r.trust_id = $1 and r.role = 'trustee' and r.to_on is null order by p.name`, [t.id]);
    const changes = await db.query(`select p.name, r.from_on, r.to_on from roles r join people p on p.id = r.person_id where r.trust_id = $1 and r.role = 'trustee'
      and (r.to_on is not null or r.from_on > $2)
      and (coalesce(r.to_on, r.from_on) >= current_date - interval '1 year' or not exists (select 1 from notices n where n.role_id = r.id))
      order by coalesce(r.to_on, r.from_on)`, [t.id, iso(t.established_on)]);
    const body = [`To: ${p?.name || '[beneficiary]'}`, `Subject: ${t.name}: information for beneficiaries`, '', `Dear ${p ? p.name.split(' ')[0] : '[name]'},`, '',
      `We are the trustees of the ${t.name}. We are writing because you are a beneficiary of the trust.`, '',
      '**The trustees, and how to reach them**', ...trustees.map((x) => `- ${x.name}${x.email ? `, ${x.email}` : ''}${x.phone ? `, ${x.phone}` : ''}`), '',
      ...(changes.length ? ['**Changes of trustee**', ...changes.map((c) => c.to_on ? `- ${c.name} retired as a trustee on ${fmtDate(c.to_on)}.` : `- ${c.name} was appointed a trustee on ${fmtDate(c.from_on)}.`), ''] : []),
      '**Your right to ask**', 'You can ask the trustees for a copy of the terms of the trust, or for other trust information. We will consider each request and respond within a reasonable time.', '',
      'Yours sincerely,', ...trustees.map((x) => x.name), '',
      `<!-- Not sent. Trusts Act 2019 s 51(3). Before sending, weigh the s 53 factors for this beneficiary. After sending: /notify ${t.code} --kind=basic-info${p ? ` --to=${p.code}` : ''}${changes.length ? ` (and --kind=trustee-change --trustee=<code> for each change)` : ''} -->`];
    return { file: draftFile(`beneficiary-notice-${t.code}${p ? `-${p.code}` : ''}.md`, body.join('\n') + '\n'), trust: t.code, to: p?.name || 'every beneficiary', trustee_changes: changes.length };
  },
  // The reply to a beneficiary's request for trust information.
  async 'draft-request-reply'(db, [term], f) {
    const q = await request(db, term);
    const [p] = await db.query('select * from people where id = $1', [q.person_id]);
    const [t] = await db.query('select * from v_trusts where id = $1', [q.trust_id]);
    const outcome = f.outcome ? oneOf(String(f.outcome), ['given', 'part', 'refused'], 'outcome') : 'given';
    const body = [`To: ${p.name}`, `Subject: ${t.name}: your request for information`, '', `Dear ${p.name.split(' ')[0]},`, '',
      `Thank you for your request of ${fmtDate(q.received_on)} for: ${q.asked_for}.`, '',
      outcome === 'given' ? 'The trustees have considered your request and the information is attached.'
        : outcome === 'part' ? 'The trustees have considered your request. Some of the information is attached. [Say what is withheld and why, in plain words.]'
          : 'The trustees have considered your request and have decided not to provide the information at this time. [The reasons, in plain words.]',
      '', ...(outcome !== 'given' && t.jurisdiction === 'NZ' ? ['You may ask the court to review this decision.', ''] : []),
      'Yours sincerely,', t.trustee_names || '[trustees]', '',
      `<!-- Not sent. ${t.jurisdiction === 'NZ' ? 'Trusts Act 2019 ss 52 and 53: record the factors weighed. ' : ''}After sending: /answer ${q.ref} --outcome=${outcome}${outcome === 'given' ? '' : ' --reason="..."'} -->`];
    return { file: draftFile(`request-reply-${q.ref}.md`, body.join('\n') + '\n'), request: q.ref, outcome };
  },
  // A trust summary for the client meeting: one page per trust.
  async 'draft-summary'(db, [term]) {
    const t = await trust(db, term);
    const d = await reads.trust(db, [t.code]);
    const dist = await db.query(`select d.income_year, p.name, d.kind, d.amount_cents, d.share_pct from distributions d join people p on p.id = d.person_id where d.trust_id = $1 and d.income_year >= $2 order by d.income_year desc, p.name`, [t.id, t.current_year - 3]);
    const body = [`# ${t.name}: trust summary`, '', `${t.jurisdiction === 'NZ' ? 'New Zealand' : 'Australian'} ${t.kind} trust, established ${fmtDate(t.established_on)}${t.vests_on ? `, vests ${fmtDate(t.vests_on)}` : ''}. Client: ${t.family_name}. Manager: ${t.manager || '[manager]'}.`, '',
      '## People', '| Name | Role | Since |', '|---|---|---|', ...d.people.filter((p) => !p.to_on).map((p) => `| ${p.name} | ${p.role} | ${fmtDate(p.from_on)} |`), '',
      '## What the trust holds', '| Asset | Value | Valued |', '|---|---|---|', ...d.assets.map((a) => `| ${a.description} | ${a.value_cents !== null ? money(a.value_cents, t.currency) : ''} | ${a.valued_on ? fmtDate(a.valued_on) : ''} |`), '',
      ...(d.loans.length ? ['## Loans', ...d.loans.map((l) => `- ${l.lender}: ${money(l.balance_cents, l.currency)} ${l.direction === 'owed-by-trust' ? 'owed by the trust' : 'owed to the trust'}`), ''] : []),
      '## Distributions, last four years', ...(dist.length ? dist.map((x) => `- ${x.income_year}: ${x.name}, ${x.kind} ${amountOf(x, t.currency)}`) : ['- None.']), '',
      '## Open items', ...(d.obligations.filter((o) => o.standing !== 'open').map((o) => `- ${o.item}${o.ref ? ` (${o.ref})` : ''}: ${o.standing}, due ${fmtDate(o.due_on)}`)), '',
      '<!-- Draft from the trust records. Check before it goes to the client. -->'];
    return { file: draftFile(`trust-summary-${t.code}.md`, body.join('\n') + '\n'), trust: t.code };
  },
};

// ------------------------------------------------------------------ import and export

// Column names a trust register export typically carries (the practice software's people register
// and trust list, saved to CSV from Excel), with plain alternatives. --map overrides any of them.
const MAPS = {
  trusts: { code: ['Trust Code', 'Code', 'Client Code', 'Entity Code'], name: ['Trust Name', 'Name', 'Entity Name'], family: ['Client Group', 'Group', 'Family', 'Client'],
    jurisdiction: ['Country', 'Jurisdiction'], established: ['Date of Settlement', 'Settlement Date', 'Establishment Date', 'Date Established', 'Trust Date'],
    vesting: ['Vesting Date', 'Vesting Day', 'Termination Date'], balance: ['Balance Date', 'Year End'], tax: ['IRD Number', 'IRD No', 'ABN', 'TFN', 'Tax Number'],
    kind: ['Trust Type', 'Type'], held: ['Deed Location', 'Deed Held At', 'Original Deed'] },
  people: { trust: ['Trust Code', 'Code', 'Client Code', 'Entity Code', 'Trust Name', 'Trust'], name: ['Name', 'Full Name', 'Person', 'Contact Name'], first: ['First Name', 'Given Name'], last: ['Last Name', 'Surname'],
    role: ['Role', 'Relationship', 'Position', 'Capacity'], from: ['Date Appointed', 'Appointed', 'Start Date', 'From'], to: ['Date Resigned', 'Date Retired', 'Ceased', 'End Date', 'To'],
    dob: ['Date of Birth', 'DOB'], email: ['Email', 'Email Address'], kind: ['Entity Type', 'Person Type'] },
};
const ROLE_WORDS = [[/default/i, 'default-beneficiary'], [/trustee/i, 'trustee'], [/settlor/i, 'settlor'], [/appoint/i, 'appointor'], [/protector|guardian/i, 'protector'], [/benef/i, 'beneficiary']];

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!base) throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
  const extra = mapFile ? JSON.parse(readFileSync(path.resolve(mapFile), 'utf8')) : {};
  return (row, field) => pick(row, ...(extra[field] ? [extra[field]] : []), ...(base[field] || []));
}
// "2026-10-21", "21/10/2026" (day first, as NZ and AU write it) -> 2026-10-21.
function looseDate(v, label) {
  const s = String(v || '').trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`, label);
  return date(s.slice(0, 10), label);
}
const slugCode = (s, n) => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, n);

async function importRegister(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'trust-manager') throw Error('Usage: import trust-manager <file.csv> --kind=trusts|people');
  if (!file || !existsSync(file)) throw Error(`File not found: ${file}`);
  need(f, 'kind');
  const kind = String(f.kind);
  const get = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const counts = { rows: rows.length, added: 0, skipped: 0 };
  await db.exec('begin');
  try {
    for (const [n, r] of rows.entries()) {
      const at = `row ${n + 2}`;
      try {
        if (kind === 'trusts') {
          const name = get(r, 'name');
          if (!name) throw Error('no trust name');
          const ext = `tm:trust:${get(r, 'code') || name}`;
          if ((await db.query('select 1 from trusts where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const famName = get(r, 'family') || name.replace(/\b(family|trust|the)\b/gi, '').trim() || name;
          const famCode = slugCode(famName, 16) || 'CLIENT';
          let [fam] = await db.query('select id from families where code = $1', [famCode]);
          if (!fam) [fam] = await db.query('insert into families (code, name) values ($1,$2) returning id', [famCode, famName]);
          const j = /aus|^au$|nsw|vic|qld|wa\b|sa\b|tas|act|nt\b/i.test(get(r, 'jurisdiction') || '') ? 'AU' : f.jurisdiction ? oneOf(String(f.jurisdiction).toUpperCase(), ['NZ', 'AU'], 'jurisdiction') : 'NZ';
          const est = get(r, 'established') ? looseDate(get(r, 'established'), `establishment date (${at})`) : null;
          if (!est) throw Error('no establishment or settlement date');
          const vest = get(r, 'vesting') ? looseDate(get(r, 'vesting'), `vesting date (${at})`) : null;
          const bal = String(get(r, 'balance') || '').match(/(\d{1,2})\/(\d{1,2})|(\bmar|\bjun)/i);
          const bm = bal ? (bal[2] ? Number(bal[2]) : /jun/i.test(bal[3]) ? 6 : 3) : j === 'AU' ? 6 : 3;
          let code = slugCode(get(r, 'code') || name.split(/\s+/).map((w) => w[0]).join(''), 12);
          if (code.length < 2) code = `T-${n + 1}`;
          while ((await db.query('select 1 from trusts where code = $1', [code])).length) code = `${code.slice(0, 10)}-${n + 2}`;
          const tk = String(get(r, 'kind') || '').toLowerCase();
          await db.query(`insert into trusts (code, name, family_id, jurisdiction, kind, established_on, vesting_on, balance_month, tax_ref, deed_held_at, external_id)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [code, name, fam.id, j, TRUST_KINDS.find((k) => tk.includes(k)) || 'discretionary', est, vest && vest > est ? vest : null, bm, get(r, 'tax') || null, get(r, 'held') || null, ext]);
        } else if (kind === 'people') {
          const tKey = get(r, 'trust');
          const t = (await db.query('select id, code, established_on from trusts where external_id = $1 or code = upper($2) or lower(name) = lower($2)', [`tm:trust:${tKey}`, tKey]))[0];
          if (!t) throw Error(`trust "${tKey}" not found (import trusts first)`);
          const name = get(r, 'name') || `${get(r, 'first')} ${get(r, 'last')}`.trim();
          if (!name) throw Error('no name');
          const roleWord = get(r, 'role');
          const role = ROLE_WORDS.find(([re]) => re.test(roleWord || ''))?.[1];
          if (!role) throw Error(`role "${roleWord}" is not one of trustee, settlor, appointor, protector, beneficiary`);
          const pkind = /ltd|limited|pty|company/i.test(name) || /company/i.test(get(r, 'kind') || '') ? 'company' : /trust$/i.test(name) ? 'trust' : 'individual';
          const ext = `tm:person:${name.toLowerCase()}`;
          let [p] = await db.query('select id from people where external_id = $1', [ext]);
          if (!p) {
            let code = `P-${slugCode(name, 14)}`;
            while ((await db.query('select 1 from people where code = $1', [code])).length) code = `${code.slice(0, 16)}-${n + 2}`;
            [p] = await db.query('insert into people (code, name, kind, dob, email, external_id) values ($1,$2,$3,$4,$5,$6) returning id',
              [code, name, pkind, pkind === 'individual' && get(r, 'dob') ? looseDate(get(r, 'dob'), `date of birth (${at})`) : null, get(r, 'email') || null, ext]);
          }
          const from = get(r, 'from') ? looseDate(get(r, 'from'), `date appointed (${at})`) : iso(t.established_on);
          const to = get(r, 'to') ? looseDate(get(r, 'to'), `date ceased (${at})`) : null;
          if ((await db.query('select 1 from roles where trust_id = $1 and person_id = $2 and role = $3 and from_on = $4', [t.id, p.id, role, from])).length) { counts.skipped++; continue; }
          // History comes across with its documents already handed over: the old system held that step.
          await db.query('insert into roles (trust_id, person_id, role, from_on, to_on, docs_passed_on) values ($1,$2,$3,$4,$5,$6)', [t.id, p.id, role, from, to, role === 'trustee' && to ? to : null]);
        } else throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
        counts.added++;
      } catch (err) {
        throw Error(`${at}: ${err.message}. Nothing was imported.`);
      }
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `trust-manager-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (err) {
    await db.exec('rollback');
    throw err;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'families', 'trusts', 'people', 'roles', 'assets', 'loans', 'loan_movements', 'resolutions', 'resolution_signers', 'distributions', 'documents', 'document_copies', 'notices', 'info_requests', 'actions', 'notes', 'activity'];
  const out = { exported_at: new Date().toISOString(), note: 'Confidential trust and family information. Keep this file as securely as the database.', tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `family-trusts-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importRegister, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}

export { yesNo };
