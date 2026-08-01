import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { RISK_ORDER, planIntent, validatePlan, findCandidates, validateCatalog } from '../src/index.js';
const catalog = { connectors: [JSON.parse(fs.readFileSync('fixtures/connectors/crm.json','utf8')), JSON.parse(fs.readFileSync('fixtures/connectors/social.json','utf8'))] };
test('finds candidates from deterministic keywords', () => assert.equal(findCandidates('create a CRM task', catalog).length, 1));
test('plans safe draft connector action', () => { const r=planIntent({intent:'create a CRM task', catalog, fields:{title:'Follow up'}, maxRisk:'internal_write'}); assert.equal(r.ok,true); assert.equal(r.plan.action.connector,'crm'); });
test('reports missing fields', () => { const r=planIntent({intent:'create a CRM task', catalog, fields:{}, maxRisk:'internal_write'}); assert.equal(r.ok,false); assert.match(r.errors[0], /missing field/); });
test('blocks actions above max risk', () => { const r=planIntent({intent:'publish social post', catalog, fields:{body:'hello'}, maxRisk:'draft'}); assert.equal(r.ok,false); assert.match(r.errors[0], /exceed/); });
test('rejects an unsupported maximum risk before planning', () => {
  const result = planIntent({ intent: 'create a CRM task', catalog, fields: { title: 'Follow up' }, maxRisk: 'bogus' });
  assert.deepEqual(result, { ok: false, errors: ['unsupported maxRisk: bogus'], candidates: [] });
});
test('accepts every supported risk as catalog metadata and maxRisk', () => {
  for (const risk of RISK_ORDER) {
    const riskCatalog = { connectors: [{
      id: 'supported',
      actions: [{ id: risk, risk, keywords: [risk] }]
    }] };
    const result = planIntent({ intent: risk, catalog: riskCatalog, maxRisk: risk });
    assert.equal(result.ok, true, risk);
    assert.equal(result.plan.action.risk, risk);
    assert.equal(result.plan.requiresApproval, ['external_write', 'public_publish'].includes(risk));
  }
});
test('rejects unknown and missing catalog risks before planning', () => {
  const malformedCatalog = { connectors: [{
    id: 'malformed',
    actions: [
      { id: 'unknown', risk: 'unrecognized', keywords: ['do it'] },
      { id: 'missing', keywords: ['do it'] }
    ]
  }] };
  const result = planIntent({ intent: 'do it', catalog: malformedCatalog, maxRisk: 'draft' });
  assert.deepEqual(result, {
    ok: false,
    errors: [
      'unsupported catalog risk for malformed.unknown: unrecognized',
      'unsupported catalog risk for malformed.missing: missing'
    ],
    candidates: []
  });
  assert.equal(result.plan, undefined);
});
test('validates catalog connector and action identifiers', () => {
  const malformedCatalog = { connectors: [
    { id: '', actions: [{ id: 'create', risk: 'draft' }] },
    { id: 'crm', actions: [{ id: ' ', risk: 'draft' }] }
  ] };
  assert.deepEqual(validateCatalog(malformedCatalog), [
    'catalog connector[0].id must be a non-empty string',
    'catalog connector[1].actions[0].id must be a non-empty string'
  ]);
});
test('rejects malformed optional action arrays before matching', () => {
  const cases = [
    {
      action: { id: 'create', risk: 'draft', keywords: 'create' },
      error: 'catalog connector[0].actions[0].keywords must be an array of non-empty strings'
    },
    {
      action: { id: 'create', risk: 'draft', keywords: ['create', 7], requiredFields: ['title', ''] },
      errors: [
        'catalog connector[0].actions[0].keywords must be an array of non-empty strings',
        'catalog connector[0].actions[0].requiredFields must be an array of non-empty strings'
      ]
    }
  ];
  for (const { action, error, errors = [error] } of cases) {
    assert.deepEqual(
      planIntent({ intent: 'create', catalog: { connectors: [{ id: 'crm', actions: [action] }] } }),
      { ok: false, errors, candidates: [] }
    );
  }
});
test('accepts missing and valid optional action arrays', () => {
  assert.deepEqual(validateCatalog({ connectors: [{
    id: 'crm',
    actions: [
      { id: 'list', risk: 'read' },
      { id: 'create', risk: 'draft', keywords: ['create'], requiredFields: ['title'] }
    ]
  }] }), []);
});
test('validates stored plans against catalog', () => { const plan=JSON.parse(fs.readFileSync('fixtures/plans/crm-task-plan.json','utf8')); assert.equal(validatePlan(plan,catalog).ok,true); });
test('rejects malformed catalog arrays before validating stored plans', () => {
  const plan = { action: { connector: 'crm', operation: 'create', risk: 'draft', fields: {} } };
  const malformedCatalog = { connectors: [{
    id: 'crm',
    actions: [{ id: 'create', risk: 'draft', requiredFields: ['title', false] }]
  }] };
  assert.deepEqual(validatePlan(plan, malformedCatalog), {
    ok: false,
    errors: ['catalog connector[0].actions[0].requiredFields must be an array of non-empty strings']
  });
});
test('rejects unknown and missing catalog risks when validating stored plans', () => {
  const plan = { requiresApproval: false, action: { connector: 'malformed', operation: 'unknown', risk: 'unrecognized', fields: {} } };
  const malformedCatalog = { connectors: [{
    id: 'malformed',
    actions: [
      { id: 'unknown', risk: 'unrecognized' },
      { id: 'missing' }
    ]
  }] };
  assert.deepEqual(validatePlan(plan, malformedCatalog), {
    ok: false,
    errors: [
      'unsupported catalog risk for malformed.unknown: unrecognized',
      'unsupported catalog risk for malformed.missing: missing'
    ]
  });
});
test('rejects stored plans whose risk understates catalog metadata', () => {
  const plan = {
    requiresApproval: false,
    action: { connector: 'social', operation: 'publish_post', risk: 'read', fields: { body: 'hello' } }
  };
  const result = validatePlan(plan, catalog);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ['action risk does not match catalog', 'approval required']);
});
test('accepts approval-aware plans that match public publish metadata', () => {
  const plan = {
    requiresApproval: true,
    action: { connector: 'social', operation: 'publish_post', risk: 'public_publish', fields: { body: 'hello' } }
  };
  assert.deepEqual(validatePlan(plan, catalog), { ok: true, errors: [] });
});
test('cli plan emits JSON result', () => { const out=execFileSync('node',['src/cli.js','plan','create a CRM task','--catalog','fixtures/connectors','--fields','fixtures/fields/crm-task.json','--max-risk','internal_write'],{encoding:'utf8'}); assert.match(out,/crm/); });
test('cli rejects an unsupported --max-risk value', () => {
  const result = spawnSync('node',['src/cli.js','plan','create a CRM task','--catalog','fixtures/connectors','--fields','fixtures/fields/crm-task.json','--max-risk','bogus'],{encoding:'utf8'});
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout), { ok: false, errors: ['unsupported maxRisk: bogus'], candidates: [] });
});
test('cli rejects a catalog action with a missing risk', () => {
  const catalogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-router-catalog-'));
  try {
    fs.writeFileSync(path.join(catalogDir, 'malformed.json'), JSON.stringify({
      id: 'malformed',
      actions: [{ id: 'missing', keywords: ['do it'] }]
    }));
    const result = spawnSync('node',['src/cli.js','plan','do it','--catalog',catalogDir],{encoding:'utf8'});
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: false,
      errors: ['unsupported catalog risk for malformed.missing: missing'],
      candidates: []
    });
  } finally {
    fs.rmSync(catalogDir, { recursive: true, force: true });
  }
});
test('cli emits JSON for malformed catalog arrays', () => {
  const catalogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-router-catalog-'));
  try {
    fs.writeFileSync(path.join(catalogDir, 'malformed.json'), JSON.stringify({
      id: 'malformed',
      actions: [{ id: 'create', risk: 'internal_write', keywords: 'create', requiredFields: ['title', 7] }]
    }));
    const result = spawnSync('node',['src/cli.js','plan','create','--catalog',catalogDir],{encoding:'utf8'});
    assert.equal(result.status, 2);
    assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: false,
      errors: [
        'catalog connector[0].actions[0].keywords must be an array of non-empty strings',
        'catalog connector[0].actions[0].requiredFields must be an array of non-empty strings'
      ],
      candidates: []
    });
  } finally {
    fs.rmSync(catalogDir, { recursive: true, force: true });
  }
});
test('cli accepts missing and valid optional catalog arrays', () => {
  const catalogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-router-catalog-'));
  try {
    fs.writeFileSync(path.join(catalogDir, 'valid.json'), JSON.stringify({
      id: 'valid',
      actions: [
        { id: 'list', risk: 'read' },
        { id: 'create', risk: 'draft', keywords: ['create'], requiredFields: ['title'] }
      ]
    }));
    const result = spawnSync('node',[
      'src/cli.js', 'plan', 'create', '--catalog', catalogDir,
      '--fields', 'fixtures/fields/crm-task.json', '--max-risk', 'draft'
    ],{encoding:'utf8'});
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
  } finally {
    fs.rmSync(catalogDir, { recursive: true, force: true });
  }
});
test('cli validates an approval-aware public publish plan', () => {
  const result = spawnSync('node',['src/cli.js','validate','fixtures/plans/social-post-plan.json','--catalog','fixtures/connectors'],{encoding:'utf8'});
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, errors: [] });
});
test('cli exits nonzero when blocked by risk', () => { const r=spawnSync('node',['src/cli.js','plan','publish social post','--catalog','fixtures/connectors','--fields','fixtures/fields/social.json'],{encoding:'utf8'}); assert.equal(r.status,2); });
test('cli help exits cleanly', () => { const r=spawnSync('node',['src/cli.js','--help'],{encoding:'utf8'}); assert.equal(r.status,0); assert.match(r.stdout,/Usage: connector-router/); });
test('cli version prints package version', () => { const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); const r=spawnSync('node',['src/cli.js','--version'],{encoding:'utf8'}); assert.equal(r.status,0); assert.equal(r.stdout.trim(),pkg.version); });
for (const { name, args, message } of [
  { name: 'unknown option', args: ['plan', 'intent', '--typo', 'value'], message: 'unknown option for plan: --typo' },
  { name: 'unexpected positional argument', args: ['validate', 'fixtures/plans/crm-task-plan.json', 'extra.json'], message: 'unexpected positional argument: extra.json' },
  { name: 'duplicate option', args: ['plan', 'intent', '--catalog', 'one', '--catalog', 'two'], message: 'duplicate option: --catalog' },
  { name: 'missing option value', args: ['validate', 'fixtures/plans/crm-task-plan.json', '--catalog'], message: 'missing value for --catalog' }
]) {
  test(`cli rejects ${name} with actionable usage`, () => {
    const result = spawnSync('node', ['src/cli.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(result.stderr, /Usage: connector-router <command>/);
  });
}
