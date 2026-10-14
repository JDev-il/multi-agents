'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../core/workflow/preflight');

// Fake git runner: first matching needle wins, anything else returns ''.
const fakeGit = (answers) => (cmd) => {
  const hit = answers.find(([needle]) => cmd.includes(needle));
  return hit ? hit[1] : '';
};

const BASE = {
  ROOT: '/fake/root',
  scope: 'client',
  agent: 'UI',
  branchName: 'agent/client/ui/1',
  intent: 'continuation',
};

const POLICY = { client: { allowed: ['client/**'], blocked: [] } };

// Pretends only scope-policy.json exists on disk (no .config.json).
const policyOnDisk = {
  existsSync: (p) => p.endsWith('scope-policy.json'),
  readFileSync: () => JSON.stringify(POLICY),
};

test('assess — zero commits behind main proceeds', () => {
  const result = assess({
    ...BASE,
    gitRunner: fakeGit([['rev-list', '0']]),
    existsSync: () => false,
    readFileSync: () => { throw new Error('policy must not be read when not behind'); },
  });
  assert.equal(result.decision, 'proceed');
  assert.equal(result.commitsBehind, 0);
});

test('assess — missing scope-policy.json escalates', () => {
  // intent is continuation, so only the missing policy can produce escalate here
  const result = assess({
    ...BASE,
    gitRunner: fakeGit([
      ['rev-list', '3'],
      ['git log', 'a1b2c3d some commit'],
      ['git diff', 'client/app.ts'],
    ]),
    existsSync: () => false,
    readFileSync: () => { throw new Error('policy must not be read when missing'); },
  });
  assert.equal(result.decision, 'escalate');
  assert.equal(result.commitsBehind, 3);
});

test('assess — no scope overlap proceeds', () => {
  const result = assess({
    ...BASE,
    gitRunner: fakeGit([
      ['rev-list', '2'],
      ['git log', 'a1b2c3d backend change'],
      ['git diff', 'backend/server.ts'],
    ]),
    ...policyOnDisk,
  });
  assert.equal(result.decision, 'proceed');
  assert.equal(result.commitsBehind, 2);
  assert.deepEqual(result.inScopeFiles, []);
});

test('assess — scope overlap with correction intent escalates', () => {
  const result = assess({
    ...BASE,
    intent: 'correction',
    gitRunner: fakeGit([
      ['rev-list', '1'],
      ['git log', 'a1b2c3d client change'],
      ['git diff', 'client/app.ts'],
      ['merge-base', 'base123'],
      ['merge-tree', 'clean merge output'],
    ]),
    ...policyOnDisk,
  });
  assert.equal(result.decision, 'escalate');
  assert.deepEqual(result.inScopeFiles, ['client/app.ts']);
  assert.equal(result.conflictPrediction, false);
});
