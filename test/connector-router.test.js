import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';
import { planIntent, validatePlan, findCandidates } from '../src/index.js';
const catalog = { connectors: [JSON.parse(fs.readFileSync('fixtures/connectors/crm.json','utf8')), JSON.parse(fs.readFileSync('fixtures/connectors/social.json','utf8'))] };
test('finds candidates from deterministic keywords', () => assert.equal(findCandidates('create a CRM task', catalog).length, 1));
test('plans safe draft connector action', () => { const r=planIntent({intent:'create a CRM task', catalog, fields:{title:'Follow up'}, maxRisk:'internal_write'}); assert.equal(r.ok,true); assert.equal(r.plan.action.connector,'crm'); });
test('reports missing fields', () => { const r=planIntent({intent:'create a CRM task', catalog, fields:{}, maxRisk:'internal_write'}); assert.equal(r.ok,false); assert.match(r.errors[0], /missing field/); });
test('blocks actions above max risk', () => { const r=planIntent({intent:'publish social post', catalog, fields:{body:'hello'}, maxRisk:'draft'}); assert.equal(r.ok,false); assert.match(r.errors[0], /exceed/); });
test('validates stored plans against catalog', () => { const plan=JSON.parse(fs.readFileSync('fixtures/plans/crm-task-plan.json','utf8')); assert.equal(validatePlan(plan,catalog).ok,true); });
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
test('cli exits nonzero when blocked by risk', () => { const r=spawnSync('node',['src/cli.js','plan','publish social post','--catalog','fixtures/connectors','--fields','fixtures/fields/social.json'],{encoding:'utf8'}); assert.equal(r.status,2); });
test('cli help exits cleanly', () => { const r=spawnSync('node',['src/cli.js','--help'],{encoding:'utf8'}); assert.equal(r.status,0); assert.match(r.stdout,/Usage: connector-router/); });
test('cli version prints package version', () => { const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); const r=spawnSync('node',['src/cli.js','--version'],{encoding:'utf8'}); assert.equal(r.status,0); assert.equal(r.stdout.trim(),pkg.version); });
