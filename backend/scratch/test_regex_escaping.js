/**
 * Regression test for the "Invalid regular expression" 500s.
 *
 *   node scratch/test_regex_escaping.js
 *
 * Reported failure:
 *   GET /api/properties?search=sajkj%5C  ->  500
 *   SyntaxError: Invalid regular expression: /sajkj\/i: \ at end of pattern
 *
 * User-supplied query params were interpolated straight into `new RegExp(...)`.
 * Covers the escaping helper plus the real controllers that took the raw input.
 */

import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';

import { escapeRegex, safeRegex } from '../utils/escapeRegex.js';
import { getPublicProperties, getPublicBuilders } from '../controllers/propertyController.js';
import { getFeed } from '../controllers/reelController.js';

// Payloads that previously threw, plus pattern-injection attempts
const HOSTILE_INPUTS = [
  'sajkj\\',          // the reported crash: trailing backslash
  '(',                // unterminated group
  '[',                // unterminated character class
  '*',                // nothing to repeat
  '+',
  '?',
  'a{2,',             // unterminated quantifier
  '.*',               // injection: would match everything
  '^$',
  'a|b',
  '(?<name>x)',
  '(a+)+$',           // classic catastrophic-backtracking shape
  '\\p{',
  ')(',
  'हैदराबाद',          // non-ASCII must still work
  "O'Brien & Sons (P) Ltd."
];

let passed = 0;
const failures = [];

const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
};

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const runController = async (handler, query, user = null) => {
  let statusCode = 200;
  let payload = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { payload = b; return this; }
  };
  await handler({ query, user, params: {} }, res);
  return { statusCode, payload };
};

// --- A. the helper ---------------------------------------------------------

const testHelper = () => {
  console.log('\nA. escapeRegex / safeRegex');

  check('every hostile input compiles instead of throwing', () => {
    HOSTILE_INPUTS.forEach(input => {
      try {
        safeRegex(input);
      } catch (err) {
        throw new Error(`safeRegex threw on ${JSON.stringify(input)}: ${err.message}`);
      }
    });
  });

  check('the reported input produces a literal matcher', () => {
    const re = safeRegex('sajkj\\');
    assert(re.test('xx sajkj\\ yy'), 'should match the literal text');
    assert(!re.test('sajkj'), 'should not match without the backslash');
  });

  check('metacharacters are matched literally, not interpreted', () => {
    assert(safeRegex('.*').test('a.*b'), '".*" should match a literal ".*"');
    assert(!safeRegex('.*').test('anything else'), '".*" must not act as a wildcard');
    assert(safeRegex('a|b').test('a|b'), 'pipe should be literal');
    assert(!safeRegex('a|b').test('a'), 'pipe must not act as alternation');
  });

  check('exact mode anchors the pattern', () => {
    const re = safeRegex('Hyderabad', { exact: true });
    assert(re.test('hyderabad'), 'should be case-insensitive');
    assert(!re.test('Hyderabad East'), 'should not match a superstring');
  });

  check('anchors inside user input cannot escape exact mode', () => {
    const re = safeRegex('$|^', { exact: true });
    assert(re.test('$|^'), 'literal match');
    assert(!re.test('anything'), 'must not degenerate into a match-all');
  });

  check('null and undefined are handled', () => {
    assert(escapeRegex(null) === '', 'null -> ""');
    assert(escapeRegex(undefined) === '', 'undefined -> ""');
    safeRegex(null);
  });

  check('non-ASCII input is preserved', () => {
    assert(safeRegex('हैदराबाद').test('हैदराबाद'), 'devanagari should match');
  });
};

// --- B. the endpoints that crashed ------------------------------------------

const testEndpoints = async () => {
  console.log('\nB. Endpoints (live controllers)');

  // The exact request from the server log
  const reported = await runController(getPublicProperties, {
    search: 'sajkj\\',
    transactionType: 'sell',
    sort: 'newest'
  });
  check('GET /api/properties?search=sajkj\\ returns 200 (was 500)', () => {
    assert(reported.statusCode === 200, `expected 200, got ${reported.statusCode}: ${JSON.stringify(reported.payload)?.slice(0, 200)}`);
  });

  check('a hostile search returns no spurious matches', () => {
    const list = reported.payload?.properties ?? reported.payload?.data ?? [];
    assert(Array.isArray(list), 'expected an array of properties');
    assert(list.length === 0, `"sajkj\\" should match nothing, got ${list.length}`);
  });

  // Every hostile payload, across each regex-backed filter
  const paramsToFuzz = ['search', 'city', 'landType', 'occupancy', 'gender', 'subType', 'facing'];
  const crashes = [];
  for (const param of paramsToFuzz) {
    for (const input of HOSTILE_INPUTS) {
      const { statusCode, payload } = await runController(getPublicProperties, { [param]: input });
      if (statusCode !== 200) crashes.push(`${param}=${JSON.stringify(input)} -> ${statusCode} ${payload?.message || ''}`);
    }
  }
  check(`all ${paramsToFuzz.length * HOSTILE_INPUTS.length} property-filter combinations return 200`, () => {
    assert(crashes.length === 0, `failed:\n      ${crashes.slice(0, 8).join('\n      ')}`);
  });

  const builderCrashes = [];
  for (const input of HOSTILE_INPUTS) {
    const { statusCode } = await runController(getPublicBuilders, { locality: input });
    if (statusCode !== 200) builderCrashes.push(`locality=${JSON.stringify(input)} -> ${statusCode}`);
  }
  check('GET /api/properties/builders survives every hostile locality', () => {
    assert(builderCrashes.length === 0, builderCrashes.join('; '));
  });

  const reelCrashes = [];
  for (const input of HOSTILE_INPUTS) {
    for (const param of ['search', 'city', 'propertyType']) {
      const { statusCode } = await runController(getFeed, { [param]: input });
      if (statusCode !== 200) reelCrashes.push(`${param}=${JSON.stringify(input)} -> ${statusCode}`);
    }
  }
  check('GET /api/reels survives every hostile search/city/propertyType', () => {
    assert(reelCrashes.length === 0, reelCrashes.slice(0, 5).join('; '));
  });
};

// --- runner ----------------------------------------------------------------

const ensureSrvResolvable = async (url) => {
  if (!url.startsWith('mongodb+srv://')) return;
  const host = url.split('@')[1]?.split('/')[0];
  if (!host) return;
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch (err) {
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ETIMEOUT') throw err;
    console.warn(`System DNS (${dns.getServers().join(', ')}) refused the SRV lookup - falling back to public DNS.`);
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  }
};

const run = async () => {
  testHelper();

  await ensureSrvResolvable(process.env.MONGODB_URL);
  await mongoose.connect(process.env.MONGODB_URL);
  try {
    await testEndpoints();
  } finally {
    await mongoose.disconnect();
  }

  console.log(`\n${'='.repeat(60)}`);
  if (failures.length === 0) {
    console.log(`ALL PASSED - ${passed} checks`);
    process.exit(0);
  }
  console.log(`FAILED - ${passed} passed, ${failures.length} failed:`);
  failures.forEach(f => console.log(`  - ${f.name}\n      ${f.message}`));
  process.exit(1);
};

run().catch(err => {
  console.error('\nTest run crashed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
