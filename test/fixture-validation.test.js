import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const fixturesRoot = fileURLToPath(new URL('../fixtures/', import.meta.url));

async function readFixtureSet(directory, validate) {
  const entries = (await readdir(path.join(fixturesRoot, directory), { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort();
  assert.ok(entries.length > 0, `fixtures/${directory}: expected at least one JSON fixture`);

  for (const name of entries) {
    const fixturePath = `fixtures/${directory}/${name}`;
    let value;
    try {
      value = JSON.parse(await readFile(path.join(fixturesRoot, directory, name), 'utf8'));
    } catch (error) {
      assert.fail(`${fixturePath}: invalid JSON (${error.message})`);
    }
    try {
      validate(value);
    } catch (error) {
      assert.fail(`${fixturePath}: ${error.message}`);
    }
  }
}

function requireString(value, field) {
  assert.equal(typeof value, 'string', `${field} must be a string`);
  assert.ok(value.trim(), `${field} must not be empty`);
}

function validateConnector(value) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'expected an object');
  requireString(value.id, 'id');
  requireString(value.name, 'name');
  assert.ok(Array.isArray(value.actions) && value.actions.length > 0, 'actions must be a non-empty array');
  for (const [index, action] of value.actions.entries()) {
    assert.ok(action && typeof action === 'object' && !Array.isArray(action), `actions[${index}] must be an object`);
    requireString(action.id, `actions[${index}].id`);
    requireString(action.risk, `actions[${index}].risk`);
    assert.ok(Array.isArray(action.keywords) && action.keywords.every(item => typeof item === 'string'), `actions[${index}].keywords must be a string array`);
    assert.ok(Array.isArray(action.requiredFields) && action.requiredFields.every(item => typeof item === 'string'), `actions[${index}].requiredFields must be a string array`);
  }
}

function validatePlan(value) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'expected an object');
  requireString(value.id, 'id');
  requireString(value.intent, 'intent');
  assert.ok(value.action && typeof value.action === 'object' && !Array.isArray(value.action), 'action must be an object');
  for (const field of ['connector', 'operation', 'risk']) requireString(value.action[field], `action.${field}`);
  assert.ok(value.action.fields && typeof value.action.fields === 'object' && !Array.isArray(value.action.fields), 'action.fields must be an object');
  assert.equal(typeof value.requiresApproval, 'boolean', 'requiresApproval must be a boolean');
  assert.equal(typeof value.approved, 'boolean', 'approved must be a boolean');
  assert.ok(Array.isArray(value.evidence), 'evidence must be an array');
}

test('every connector fixture has the catalog connector shape', async () => {
  await readFixtureSet('connectors', validateConnector);
});

test('every plan fixture has the routing plan shape', async () => {
  await readFixtureSet('plans', validatePlan);
});
