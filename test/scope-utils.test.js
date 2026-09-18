'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesGlob, findViolations, resolveScope, findInScope } = require('../core/workflow/scope-utils');

test('matchesGlob — exact match', () => {
  assert.equal(matchesGlob('CONTRACTS.md', 'CONTRACTS.md'), true);
  assert.equal(matchesGlob('CONTRACTS.md', 'OTHER.md'), false);
});

test('matchesGlob — single * does not cross path separators', () => {
  assert.equal(matchesGlob('client/app.ts', 'client/*.ts'), true);
  assert.equal(matchesGlob('client/sub/app.ts', 'client/*.ts'), false);
});

test('matchesGlob — double ** crosses path separators', () => {
  // ** requires at least one intervening path segment in this implementation —
  // it does not collapse to "zero directories". Confirmed live against source.
  assert.equal(matchesGlob('client/app.ts', 'client/**/app.ts'), false);
  assert.equal(matchesGlob('client/sub/app.ts', 'client/**/app.ts'), true);
  assert.equal(matchesGlob('client/sub/deep/app.ts', 'client/**/app.ts'), true);
});

test('matchesGlob — /** suffix requires a directory boundary (regression)', () => {
  assert.equal(matchesGlob('client/app.ts', 'client/**'), true);
  assert.equal(matchesGlob('clientele/secret.ts', 'client/**'), false);
  assert.equal(matchesGlob('clientCONTRACTS.md', 'client/**'), false);
  assert.equal(matchesGlob('backend-old/x.ts', 'backend/**'), false);
});

test('findViolations — in-scope file passes', () => {
  assert.deepEqual(findViolations(['client/app.ts'], ['client/**'], []), []);
});

test('findViolations — out-of-scope file is blocked', () => {
  assert.deepEqual(findViolations(['backend/server.ts'], ['client/**'], []), ['backend/server.ts']);
});

test('findViolations — blocked list overrides allowed', () => {
  assert.deepEqual(
    findViolations(['client/CONTRACTS.md'], ['client/**'], ['client/CONTRACTS.md']),
    ['client/CONTRACTS.md']
  );
});

test('findViolations — clientele/ regression (explicit)', () => {
  assert.deepEqual(
    findViolations(['clientele/secret.ts', 'client/ok.ts'], ['client/**'], []),
    ['clientele/secret.ts']
  );
});

test('findInScope — clientele/ regression, opposite failure direction (explicit)', () => {
  assert.deepEqual(
    findInScope(['clientele/secret.ts', 'client/ok.ts'], ['client/**'], []),
    ['client/ok.ts']
  );
});

test('resolveScope — base policy, no override', () => {
  const policy = { client: { allowed: ['client/**'], blocked: ['CONTRACTS.md'] } };
  assert.deepEqual(resolveScope(policy, 'client', 'LOGIC', {}), {
    allowed: ['client/**'],
    blocked: ['CONTRACTS.md'],
  });
});

test('resolveScope — active override wins', () => {
  const policy = {
    client: {
      allowed: ['client/**'],
      blocked: [],
      agentOverrides: { UI: { allowed: ['client/**', 'CONTRACTS.md'], onlyBeforeScaffolded: true } },
    },
  };
  assert.deepEqual(resolveScope(policy, 'client', 'UI', { client: false }).allowed, ['client/**', 'CONTRACTS.md']);
});

test('resolveScope — override suppressed once scaffolded (onlyBeforeScaffolded)', () => {
  const policy = {
    client: {
      allowed: ['client/**'],
      blocked: [],
      agentOverrides: { UI: { allowed: ['client/**', 'CONTRACTS.md'], onlyBeforeScaffolded: true } },
    },
  };
  assert.deepEqual(resolveScope(policy, 'client', 'UI', { client: true }).allowed, ['client/**']);
});
