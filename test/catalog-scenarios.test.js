import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planIntent, validatePlan } from '../src/index.js';

const catalog = JSON.parse(fs.readFileSync(new URL('../fixtures/catalog-scenarios/catalog.json', import.meta.url), 'utf8'));

function stablePlan(result) {
  const { id, ...plan } = result.plan;
  assert.match(id, /^route_[a-z0-9]+_[0-9a-f]{32}$/);
  return plan;
}

test('external catalog scenarios produce deterministic read and draft plan contracts', () => {
  const read = planIntent({ intent: 'find calendar events', catalog });
  assert.equal(read.ok, true);
  assert.deepEqual(stablePlan(read), {
    intent: 'find calendar events', requiresApproval: false, approved: false,
    action: { connector: 'calendar', operation: 'find_events', risk: 'read', fields: {} },
    evidence: [{ source: 'calendar-export.json', note: 'Matched keywords: find calendar events' }]
  });
  assert.deepEqual(validatePlan(read.plan, catalog), { ok: true, errors: [] });

  const draft = planIntent({ intent: 'draft support reply', catalog, fields: { body: 'Thanks for contacting us.' } });
  assert.equal(draft.ok, true);
  assert.deepEqual(stablePlan(draft), {
    intent: 'draft support reply', requiresApproval: false, approved: false,
    action: { connector: 'support', operation: 'draft_reply', risk: 'draft', fields: { body: 'Thanks for contacting us.' } },
    evidence: [{ source: 'support-catalog.json', note: 'Matched keywords: draft support reply' }]
  });
  assert.deepEqual(validatePlan(draft.plan, catalog), { ok: true, errors: [] });
});

test('external catalog scenarios reject missing fields and require approval for sending', () => {
  const missing = planIntent({ intent: 'draft support reply', catalog });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.errors, ['missing field: body']);

  const send = planIntent({ intent: 'send support reply', catalog, fields: { body: 'Resolved.' } });
  assert.equal(send.ok, false);
  assert.deepEqual(send.errors, ['matching actions exceed maxRisk']);
  assert.deepEqual(send.candidates, ['support.send_reply']);

  const approvalAware = planIntent({ intent: 'send support reply', catalog, fields: { body: 'Resolved.' }, maxRisk: 'external_write' });
  assert.equal(approvalAware.ok, true);
  assert.equal(approvalAware.plan.requiresApproval, true);
  assert.equal(approvalAware.plan.approved, false);
  assert.deepEqual(validatePlan(approvalAware.plan, catalog), { ok: false, errors: ['approval not granted'] });
});

test('external catalog scenarios make ambiguous routing and risk limits explicit', () => {
  const ambiguous = {
    connectors: [...catalog.connectors, { id: 'legacy-calendar', actions: [{ id: 'search', risk: 'read', keywords: ['find calendar events'] }] }]
  };
  assert.deepEqual(planIntent({ intent: 'find calendar events', catalog: ambiguous }), {
    ok: false, errors: ['multiple connector actions match intent; clarify the request'],
    candidates: ['calendar.find_events', 'legacy-calendar.search']
  });
  assert.deepEqual(planIntent({ intent: 'send support reply', catalog, fields: { body: 'Resolved.' }, maxRisk: 'draft' }), {
    ok: false, errors: ['matching actions exceed maxRisk'], candidates: ['support.send_reply']
  });
});
