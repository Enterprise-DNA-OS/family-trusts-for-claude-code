#!/usr/bin/env node
// npm test: a temporary database, the demo practice, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, drafts, commands, QUESTIONS, cents, date, today } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'trusts-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ahead = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const ob = async (trust, item, ref) => one('select * from v_obligations where trust = $1 and item = $2 and ($3::text is null or ref = $3) order by due_on desc limit 1', [trust, item, ref ?? null]);

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);
  eq((await one('select count(*)::int as n from trusts')).n, 7, 'seed is idempotent (trusts)');
  eq((await one('select count(*)::int as n from people')).n, 19, 'seed is idempotent (people)');
  eq((await one('select count(*)::int as n from roles')).n, 48, 'seed is idempotent (roles)');
  eq((await one('select count(*)::int as n from loan_movements')).n, 8, 'seed is idempotent (loan movements)');
  eq((await one('select count(*)::int as n from notes')).n, 5, 'seed is idempotent (notes)');
  eq((await one('select count(*)::int as n from activity')).n, 1, 'seed activity written once');

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { family: ['WALKER'], trust: ['WFT'], register: ['WFT'], person: ['Ada'], resolution: ['RES-WBT-001'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');
  ok(ins[5].rows.some((r) => r.name === 'Graham Walker' && r.trusts === 2), 'trustee of more than one trust');
  ok(ins[6].rows.some((r) => r.beneficiary === 'Ruby Chen' && r.status === 'never given'), 'beneficiaries never told');
  ok(ins[6].rows.some((r) => r.beneficiary === 'Tom Walker' && r.status.startsWith('withheld')), 'a recorded decision to withhold');
  ok(ins[9].rows.some((r) => r.trust === 'HWT'), 'trusts vesting soon');

  // Parsing is strict.
  eq(cents('1,450.00', 'x'), 145000);
  eq(cents('$98', 'x'), 9800);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;

  // The rules in the database.
  const r = await one(`select year_end(2026, 3)::text as nz, year_end(2026, 6)::text as au, year_end(2028, 2)::text as leap,
    income_year_of('2026-03-31', 3) as a, income_year_of('2026-04-01', 3) as b, income_year_of('2026-06-30', 6) as c, income_year_of('2026-07-01', 6) as d`);
  eq(r.nz, '2026-03-31'); eq(r.au, '2026-06-30'); eq(r.leap, '2028-02-29', 'balance month handles a leap year');
  eq(r.a, 2026, 'NZ year 2026 ends 31 March 2026'); eq(r.b, 2027, '1 April starts the next year');
  eq(r.c, 2026); eq(r.d, 2027, 'AU year 2027 starts 1 July 2026');
  eq((await one(`select vests_on::text as v from v_trusts where code = 'KWT'`)).v, '2146-03-15', 'no vesting day in the deed: 125 years (s 16)');

  // The demo practice says what it should.
  const att = await call('attention');
  const has = (item, ref) => att.some((x) => x.item === item && (!ref || x.ref === ref));
  ok(has('not signed by every trustee', 'RES-WBT-001'), 's 38: a resolution one trustee did not sign');
  ok(has('sole trustee is the sole beneficiary', 'HWT'), 'merger');
  ok(has('trustee appointment notified overdue', 'WFT'), 's 51(3)(c): appointment not notified');
  ok(has('trustee retirement notified overdue', 'WFT'), 's 51(3)(c): retirement not notified');
  ok(!att.some((x) => x.ref === 'HWT' && x.item.startsWith('trustee retirement')), 'a notified retirement stays quiet');
  ok(has('basic information considered overdue', 'KWT'), 's 51(4): never considered');
  ok(has('information request answered overdue', 'WBT'), 's 52: request past 20 days');
  ok(att.some((x) => x.detail.includes('REQ-0003') && x.item.endsWith('due soon')) && !att.some((x) => x.detail.includes('REQ-0003') && x.item.endsWith('overdue')), 'a 6-day-old request is due soon, not overdue');
  ok(has('no copy of the deed', 'WFT'), 's 46: corporate trustee holds no copy');
  ok(has('minor beneficiary income', 'WFT'), 'HC 35: under 16, over $1,000');
  ok(!att.some((x) => x.item === 'minor beneficiary income' && x.detail.includes('Max Chen')), 'under $1,000 to a minor is not flagged');
  ok(has('outside the family group', 'OFT'), 'family trust distribution tax');
  ok(has('unpaid entitlement to a company', 'OFT'), 'Div 7A unpaid entitlement');
  ok(has('paid to someone else', 'OFT'), 's 100A review');
  ok(has('no TFN quoted', 'OFT'), 'TFN withholding');
  ok(has('trust vests due soon', 'HWT'), 'vesting inside two years');
  ok(has('annual review overdue', 'WFT'), 'annual review overdue');
  ok(has('action overdue', 'ACT-0001'), 'overdue action');
  ok(has('not valued in 3 years', 'AST-KWT-1'), 'stale valuation');
  ok(!att.some((x) => x.ref === 'CIT'), 'a wound-up trust stays quiet');
  eq(att[0].item.includes('overdue') || att[0].item.includes('signed') || att[0].item.includes('sole'), true, 'law first');
  eq((await ob('BRT', 'distribution resolution', `BRT ${(await one(`select income_year_of(current_date, 6) - 2 as y`)).y}`)).standing, 'done late', 'deed date missed stays on the record as late');
  eq((await ob('BRT', 'distribution resolution', `BRT ${(await one(`select income_year_of(current_date, 6) - 2 as y`)).y}`)).basis, 'deed', 'the deed set that date');
  const comp = await call('compliance');
  ok(comp.find((x) => x.item === 'trustee appointment notified').overdue === 1, 'compliance counts the missed notice');

  // A new trust, its people, and the gates.
  await call('add-family', ['PATEL'], { ...A, name: 'Anil and Meera Patel', manager: 'Priya Shah' });
  await fails(async () => call('add-family', ['patel x'], { ...A, name: 'x' }), /Usage/);
  const nt = await call('add-trust', ['PFT'], { ...A, name: 'Patel Family Trust', family: 'PATEL', jurisdiction: 'NZ', established: ago(400) });
  eq(nt.balance_month, 3, 'NZ trusts balance at 31 March by default');
  await fails(async () => call('add-trust', ['PAU'], { ...A, name: 'x', family: 'PATEL', jurisdiction: 'AU', established: ago(10) }), /vesting/);
  await fails(async () => call('add-trust', ['PX'], { ...A, name: 'x', family: 'PATEL', jurisdiction: 'NZ', established: ago(10), 'resolve-by': '06-28' }), /Australian/);
  await fails(async () => call('add-trust', ['PY'], { ...A, name: 'x', family: 'PATEL', jurisdiction: 'NZ', established: ahead(3) }), /future/);
  await call('add-person', ['P-APATEL'], { ...A, name: 'Anil Patel', dob: '1970-02-14' });
  await call('add-person', ['P-MPATEL'], { ...A, name: 'Meera Patel', dob: '1972-09-02' });
  await call('add-person', ['P-RPATEL'], { ...A, name: 'Rohan Patel', dob: ago(365 * 15) });
  await call('add-person', ['P-KAURI'], { ...A, name: 'Kauri Trustees Ltd', kind: 'company' });
  await fails(async () => call('add-person', ['P-BAD'], { ...A, name: 'Bad Ltd', kind: 'company', dob: '1990-01-01' }), /individual/);
  const ap = await call('appoint', ['PFT', 'Anil'], { ...A, role: 'trustee', from: ago(400) });
  eq(ap.role, 'trustee');
  await call('appoint', ['PFT', 'Meera'], { ...A, role: 'trustee', from: ago(400) });
  await fails(async () => call('appoint', ['PFT', 'Anil'], { ...A, role: 'trustee' }), /already/);
  await fails(async () => call('appoint', ['PFT', 'Rohan'], { ...A, role: 'trustee' }), /under 18/);
  await fails(async () => call('appoint', ['PFT', 'Rohan'], { ...A, role: 'boss' }), /--role/);
  await fails(async () => call('appoint', ['PFT', 'Rohan'], { ...A, role: 'beneficiary', from: ago(500) }), /before/);
  for (const p of ['Anil', 'Meera', 'Rohan']) await call('appoint', ['PFT', p], { ...A, role: 'beneficiary', from: ago(400) });
  await call('appoint', ['PFT', 'Anil'], { ...A, role: 'settlor', from: ago(400) });
  await fails(async () => call('appoint', ['PFT', 'Patel'], { ...A, role: 'protector' }), /ambiguous/);
  await fails(async () => call('appoint', ['PFT', 'Rohan'], { ...A, role: 'beneficiary', 'outside-family': true }), /Australian|already/);

  // A trustee change: the appointment clock starts, the notice stops it, the retirement needs the handover.
  const kauri = await call('appoint', ['PFT', 'Kauri'], { ...A, role: 'trustee', from: ago(5) });
  ok(kauri.next.some((n) => n.includes('/notify')), 'a NZ appointment says to tell the beneficiaries');
  eq((await ob('PFT', 'trustee appointment notified')).standing, 'due soon', 'the s 51(3)(c) clock is running');
  ok((await call('attention')).some((x) => x.ref === 'PFT' && x.item === 'no appointment record'), 's 45(g): no deed of appointment yet');
  await call('add-document', ['PFT'], { ...A, kind: 'appointment', title: 'Deed of appointment of Kauri Trustees Ltd', person: 'Kauri', dated: ago(5) });
  await fails(async () => call('add-document', ['PFT'], { ...A, kind: 'appointment', title: 'x' }), /--person/);
  await fails(async () => call('add-document', ['PFT'], { ...A, kind: 'financial-statements', title: 'x' }), /--year/);
  ok(!(await call('attention')).some((x) => x.ref === 'PFT' && x.item === 'no appointment record'), 'the appointment is on file');
  const n1 = await call('notify', ['PFT'], { ...A, kind: 'trustee-change', trustee: 'Kauri' });
  eq(n1.to, 'every beneficiary');
  eq((await ob('PFT', 'trustee appointment notified')).standing, 'done', 'notice given in time');
  await fails(async () => call('notify', ['PFT'], { ...A, kind: 'trustee-change' }), /--trustee/);
  await fails(async () => call('notify', ['PFT'], { ...A, kind: 'basic-info', to: 'Graham' }), /not a beneficiary/);
  const deed = await call('add-document', ['PFT'], { ...A, kind: 'deed', title: 'Trust deed', dated: ago(400) });
  ok(deed.next.includes('/copy-held'), 'a deed asks who holds a copy');
  ok((await call('attention')).some((x) => x.ref === 'PFT' && x.item === 'no copy of the deed'), 's 46: no copies yet');
  for (const p of ['Anil', 'Meera', 'Kauri']) await call('copy-held', [deed.ref], { ...A, by: p });
  await fails(async () => call('copy-held', [deed.ref], { ...A, by: 'Anil' }), /already/);
  ok(!(await call('attention')).some((x) => x.ref === 'PFT' && x.item === 'no copy of the deed'), 'every trustee holds a copy');
  const ret = await call('retire', ['PFT', 'Meera'], { ...A, role: 'trustee', to: ago(2) });
  ok(ret.next.some((n) => n.includes('/docs-passed')), 'retirement asks for the handover');
  eq((await ob('PFT', 'documents passed on', 'Meera Patel')).standing, 'overdue', 's 48: documents not yet handed over');
  const dp = await call('docs-passed', ['PFT', 'Meera'], { ...A, on: ago(1) });
  eq(dp.on_time, false, 'a day late is late');
  await fails(async () => call('docs-passed', ['PFT', 'Meera'], A), /Already/);
  await fails(async () => call('retire', ['PFT', 'Meera'], { ...A, role: 'trustee' }), /not a current/);
  await call('retire', ['PFT', 'Kauri'], { ...A, role: 'trustee', to: ago(1), 'docs-passed': ago(1) });
  await fails(async () => call('retire', ['PFT', 'Anil'], { ...A, role: 'trustee' }), /last trustee/);
  await call('appoint', ['PFT', 'Meera'], { ...A, role: 'trustee' });

  // Basic information, withholding, requests.
  await call('notify', ['PFT'], { ...A, kind: 'basic-info', to: 'Anil' });
  await fails(async () => call('withhold', ['PFT', 'Rohan'], { ...A, reason: 'minor' }), /section 53/);
  const wh = await call('withhold', ['PFT', 'Rohan'], { ...A, reason: 'Rohan is 15; his parents are trustees and beneficiaries and receive the information for him.' });
  ok(wh.ref.startsWith('NTC-PFT-'), 'withholding is recorded with its reason');
  const rq = await call('request', ['PFT', 'Anil'], { ...A, what: 'The latest financial statements', received: ago(3) });
  eq(rq.due_on, ahead(17), 'due 20 days after receipt');
  eq((await ob('PFT', 'information request answered', rq.ref)).standing, 'due soon');
  await fails(async () => call('answer', [rq.ref], { ...A, outcome: 'refused' }), /--reason/);
  const an = await call('answer', [rq.ref], { ...A, outcome: 'given' });
  eq(an.within_house_rule, true);
  await fails(async () => call('answer', [rq.ref], { ...A, outcome: 'given' }), /answered/);
  await fails(async () => call('request', ['PFT', 'Graham'], { ...A, what: 'x' }), /not a beneficiary/);

  // Assets and loans.
  const as = await call('add-asset', ['PFT'], { ...A, description: '12 Totara Street, Hamilton', kind: 'property', cost: '720000', value: '810000', valued: ago(30) });
  eq(as.ref, 'AST-PFT-1');
  const va = await call('value', [as.ref], { ...A, value: '845,000', note: 'Registered valuation' });
  eq(va.now_cents, 84500000);
  await fails(async () => call('add-asset', ['PFT'], { ...A, description: 'x', kind: 'boat' }), /--kind/);
  const ln = await call('lend', ['PFT', 'Anil'], { ...A, amount: '500000', on: ago(390), terms: 'Interest free, on demand' });
  eq(ln.direction, 'owed-by-trust');
  await fails(async () => call('forgive', [ln.ref], { ...A, amount: '20000' }), /--resolution/);
  const gift = await call('resolve', ['PFT'], { ...A, kind: 'gift', summary: 'Anil Patel forgives $20,000 of his loan', signed: 'Anil, Meera' });
  const fg = await call('forgive', [ln.ref], { ...A, amount: '20000', resolution: gift.ref });
  eq(fg.balance_cents, 48000000);
  await call('repay', [ln.ref], { ...A, amount: '30000' });
  await fails(async () => call('repay', [ln.ref], { ...A, amount: '900000' }), /no more than/);
  eq((await one(`select balance_cents from v_loans where ref = $1`, [ln.ref])).balance_cents, 45000000, 'loan balance after gift and repayment');

  // Resolutions: only trustees in office sign; unanimity is checked.
  const yr = (await one(`select income_year_of(current_date, 3) - 1 as y`)).y;
  await fails(async () => call('resolve', ['PFT'], { ...A, kind: 'distribution', summary: 'x' }), /--year/);
  await fails(async () => call('resolve', ['PFT'], { ...A, kind: 'general', summary: 'x', signed: 'Rohan' }), /not a trustee/);
  const half = await call('resolve', ['PFT'], { ...A, kind: 'distribution', year: String(yr), summary: 'Beneficiary income for the year', signed: 'Anil' });
  ok(half.warning && half.warning.includes('s 38'), 'one of two trustees is not enough');
  ok((await call('attention')).some((x) => x.item === 'not signed by every trustee' && x.ref === half.ref), 'flagged until signed');
  const sg = await call('sign', [half.ref], { ...A, by: 'Meera' });
  eq(sg.still_to_sign, null, 'now unanimous');
  await fails(async () => call('sign', [half.ref], { ...A, by: 'Meera' }), /already/);
  await fails(async () => call('sign', [half.ref], { ...A, by: 'Kauri' }), /not a trustee/);

  // Distributions and their warnings.
  const d1 = await call('distribute', [half.ref, 'Anil'], { ...A, amount: '12000' });
  eq(d1.warnings.length, 0);
  const d2 = await call('distribute', [half.ref, 'Rohan'], { ...A, amount: '1500' });
  ok(d2.warnings.some((w) => w.includes('HC 35')), 'minor beneficiary rule warned at entry');
  await fails(async () => call('distribute', [half.ref, 'Graham'], { ...A, amount: '10' }), /not a beneficiary/);
  await fails(async () => call('distribute', [half.ref, 'Anil'], { ...A }), /--amount/);
  await fails(async () => call('distribute', [half.ref, 'Anil'], { ...A, amount: '10', kind: 'franked' }), /Australian/);
  await fails(async () => call('distribute', [gift.ref, 'Anil'], { ...A, amount: '10' }), /not a distribution/);
  await call('paid', [d1.ref], { ...A, amount: '12000' });
  await fails(async () => call('paid', [d1.ref], { ...A, amount: '1' }), /entitlement/);

  // Australia: shares, family trust election, Div 7A, TFN.
  const ayr = (await one(`select income_year_of(current_date, 6) as y`)).y;
  const au = await call('resolve', ['OFT'], { ...A, kind: 'distribution', year: String(ayr), summary: 'Net income for the year', signed: 'Okafor Holdings' });
  eq(au.warning, null, 'a sole corporate trustee signs alone');
  await call('distribute', [au.ref, 'Chidi'], { ...A, share: '60' });
  await fails(async () => call('distribute', [au.ref, 'Ngozi'], { ...A, share: '50' }), /more than 100/);
  const jh = await call('distribute', [au.ref, 'James Holt'], { ...A, amount: '1000' });
  ok(jh.warnings.some((w) => w.includes('271-15')), 'outside the family group warned');
  const ada = await call('distribute', [au.ref, 'Ada'], { ...A, amount: '1000' });
  ok(ada.warnings.some((w) => w.includes('TFN')), 'no TFN warned');
  await call('tfn-quoted', ['Ada'], A);
  await fails(async () => call('tfn-quoted', ['Ada'], A), /already/);
  ok(!(await call('attention')).some((x) => x.item === 'no TFN quoted'), 'TFN quoted clears the flag');
  const upe = (await one(`select d.ref from distributions d join people p on p.id = d.person_id where p.code = 'P-OINV' and d.amount_cents > d.paid_cents`)).ref;
  await call('upe-loan', [upe], A);
  ok(!(await call('attention')).some((x) => x.item === 'unpaid entitlement to a company'), 'a complying loan clears the Div 7A flag');
  await fails(async () => call('upe-loan', [d1.ref], A), /Australian/);
  const capg = await call('distribute', [au.ref, 'Ngozi'], { ...A, amount: '5000', kind: 'capital-gain' });
  eq(capg.kind, 'capital-gain');
  eq((await one(`select standing from v_obligations where item = 'capital gain recorded' and ref = $1`, [au.ref])).standing, 'done', 'streamed by year end');

  // Year end, drafts and documents.
  const ye = await call('year-end', [], {});
  ok(ye.some((y) => y.trust === 'WBT' && y.resolution === 'overdue'), 'year end shows the missing resolution');
  ok(ye.some((y) => y.trust === 'PFT' && y.resolved_on && ['done', 'done late'].includes(y.resolution)), 'and the one just made, on time or late');
  for (const [cmd, a, f] of [['weekly-review', [], {}], ['draft-resolution', ['WBT'], {}], ['draft-resolution', ['OFT'], {}], ['draft-minutes', ['WFT'], {}],
    ['draft-beneficiary-notice', ['WFT', 'Ella'], {}], ['draft-request-reply', ['REQ-0002'], { outcome: 'part' }], ['draft-summary', ['KWT'], {}]]) {
    const out = await call(cmd, a, f);
    const body = readFileSync(path.join(process.env.OUTPUT_DIR, out.file), 'utf8');
    ok(body.length > 200 && !body.includes('undefined') && !body.includes('NaN') && !body.includes('null'), `${cmd} drafted cleanly`);
    ok(!body.includes('\u2014'), `${cmd} has no em dash`);
  }
  const notice = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'beneficiary-notice-WFT-P-EWALKER.md'), 'utf8');
  ok(notice.includes('Tōtara Trustees Ltd was appointed') && notice.includes('Ian Walker retired'), 'the notice carries the trustee changes');
  await fails(async () => call('draft-beneficiary-notice', ['OFT']), /New Zealand/);
  const dr = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', `distribution-resolution-OFT-${ayr}.md`), 'utf8');
  ok(dr.includes('presently entitled') && dr.includes('family trust election'), 'the Australian resolution says present entitlement');

  // Actions, notes, settings, wind-up.
  const ac = await call('add-action', ['PFT'], { ...A, what: 'Diary the first annual review', due: ahead(30), owner: 'Priya Shah' });
  await call('close-action', [ac.ref], { ...A, outcome: 'Booked' });
  await fails(async () => call('close-action', [ac.ref], A), /closed/);
  await call('note', ['PFT'], { ...A, kind: 'call', text: 'Anil asked about gifting.' });
  await fails(async () => call('note', ['PFT'], { ...A, kind: 'fax', text: 'x' }), /--kind/);
  await call('set', ['request_days', '15'], A);
  eq((await call('request', ['PFT', 'Meera'], { ...A, what: 'deed', received: today() })).due_on, ahead(15), 'settings change the clock');
  await fails(async () => call('set', ['request_days', 'soon'], A), /number/);
  await fails(async () => call('wind-up', ['PFT'], { ...A, on: today() }), /still holds/);
  await call('dispose', [as.ref], { ...A, on: today(), proceeds: '850000' });
  await fails(async () => call('wind-up', ['PFT'], { ...A, on: today() }), /Loans still open/);
  await call('forgive', [ln.ref], { ...A, amount: '450000', resolution: gift.ref });
  const wu = await call('wind-up', ['PFT'], { ...A, on: today() });
  eq(wu.wound_up_on, today());
  await fails(async () => call('appoint', ['PFT', 'Rohan'], { ...A, role: 'trustee' }), /wound up/);
  eq((await one(`select count(*)::int as n from roles r join trusts t on t.id = r.trust_id where t.code = 'PFT' and r.to_on is null`)).n, 0, 'winding up ends every role');
  await fails(async () => call('add-action', [], { ...A, what: 'x' }), /--due/);

  // Import from a trust register export: dry run, then for real, then again (nothing doubles).
  const tcsv = path.join(REPO_ROOT, 'examples', 'trust-manager', 'trusts.csv');
  const pcsv = path.join(REPO_ROOT, 'examples', 'trust-manager', 'people.csv');
  const dry = await call('import', ['trust-manager', tcsv], { ...A, kind: 'trusts', 'dry-run': true });
  eq(dry.dry_run, true); eq((await one(`select count(*)::int as n from trusts where external_id like 'tm:%'`)).n, 0, 'dry run keeps nothing');
  eq((await call('import', ['trust-manager', tcsv], { ...A, kind: 'trusts' })).added, 2);
  eq((await call('import', ['trust-manager', pcsv], { ...A, kind: 'people' })).added, 10);
  eq((await call('import', ['trust-manager', pcsv], { ...A, kind: 'people' })).skipped, 10, 'importing twice adds nothing');
  const pat = await one(`select * from v_trusts where code = 'PAT01'`);
  eq(pat.trustees, 2, 'the retired corporate trustee is in the past'); eq(pat.beneficiaries, 3);
  eq((await one(`select vests_on::text as v from v_trusts where code = 'RIV02'`)).v, '2146-07-01', 'no vesting date imported: 125 years');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Trust Code,Name,Role\nPAT01,Someone New,Beneficiary\nNOPE,Nobody,Trustee\n');
  const before = (await one('select count(*)::int as n from roles')).n;
  await fails(async () => call('import', ['trust-manager', bad], { ...A, kind: 'people' }), /row 3: trust "NOPE" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from roles')).n, before, 'a bad row stops the whole file');
  writeFileSync(bad, 'Trust Code,Name,Role\nPAT01,Someone New,Bystander\n');
  await fails(async () => call('import', ['trust-manager', bad], { ...A, kind: 'people' }), /role "Bystander"/);
  await fails(async () => call('import', ['trust-manager', bad], { ...A, kind: 'assets' }), /--kind/);
  await fails(async () => call('import', ['xplan', bad], { ...A, kind: 'people' }), /Usage/);

  // Export, activity, and records that cannot be rewritten or deleted.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.trusts > 0, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 40, 'activity log fills');
  await fails(async () => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(async () => db.query('delete from activity'), /append-only/);
  await fails(async () => db.query(`delete from trusts where code = 'CIT'`), /kept/);
  await fails(async () => db.query(`delete from resolutions where ref = 'RES-WBT-001'`), /kept/);
  await fails(async () => db.query(`delete from distributions`), /kept/);
  await fails(async () => db.query(`update trusts set status = 'wound-up' where code = 'WFT'`), /check|violates/i, 'wound up needs a date');
  await fails(async () => db.query(`update trusts set family_trust_election_on = '2020-01-01' where code = 'WFT'`), /check|violates/i, 'no family trust election in NZ');
  await fails(async () => db.query(`insert into notices (ref, trust_id, kind, given_on) select 'NTC-X', id, 'withheld', current_date from trusts where code = 'WFT'`), /check|violates/i, 'withholding needs a reason');
  ok(!(await db.query(`select column_name from information_schema.columns where column_name ilike '%tfn%' and column_name <> 'tfn_quoted'`)).length, 'no TFN is stored anywhere');
  await fails(async () => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/trusts.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('draft-resolution'), 'help lists commands');
  const j = cli(['obligations', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('not signed by every trustee'), 'human output');
  const wcli = cli(['note', 'WFT', '--kind=call', '--text=Graham called about the review', '--actor=Test']);
  eq(wcli.status, 0, wcli.stderr); ok(wcli.stdout.includes('WFT'), 'a write through the CLI');
  const amb = cli(['trust', 'Walker']);
  eq(amb.status, 1); ok(amb.stderr.includes('ambiguous'), 'ambiguous names list the candidates');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = readFileSync(path.join(process.env.OUTPUT_DIR, 'views', 'week.html'), 'utf8');
  ok(!page.includes('TODO') && page.includes('Needs attention') && page.includes('RES-WBT-001'), 'week view rendered');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'docs'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
