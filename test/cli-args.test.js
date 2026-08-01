import test from 'node:test';
import assert from 'node:assert/strict';
import { CliUsageError, parseCommandLine, USAGE_STATUS } from '../src/cli-args.js';

function usageError(args, message) {
  assert.throws(() => parseCommandLine(args), (error) => {
    assert.equal(error instanceof CliUsageError, true);
    assert.equal(error.message, message);
    return true;
  });
}

test('library parser returns normalized plan arguments', () => {
  assert.deepEqual(parseCommandLine(['plan', 'create a CRM task', '--catalog', 'catalog', '--max-risk', 'read']), {
    command: 'plan', positional: 'create a CRM task',
    options: { '--catalog': 'catalog', '--max-risk': 'read' }
  });
});

test('library parser rejects unknown options', () => {
  usageError(['plan', 'intent', '--typo', 'value'], 'unknown option for plan: --typo');
  usageError(['validate', 'plan.json', '--fields', 'fields.json'], 'unknown option for validate: --fields');
});

test('library parser rejects unexpected positional arguments', () => {
  usageError(['plan', 'intent', 'extra'], 'unexpected positional argument: extra');
  usageError(['validate', 'plan.json', 'extra.json'], 'unexpected positional argument: extra.json');
});

test('library parser rejects duplicate options', () => {
  usageError(['plan', 'intent', '--catalog', 'one', '--catalog', 'two'], 'duplicate option: --catalog');
  usageError(['validate', 'plan.json', '--catalog', 'one', '--catalog', 'two'], 'duplicate option: --catalog');
});

test('library parser rejects missing option values', () => {
  usageError(['plan', 'intent', '--fields'], 'missing value for --fields');
  usageError(['validate', 'plan.json', '--catalog'], 'missing value for --catalog');
});

test('usage errors have a documented nonzero status', () => assert.equal(USAGE_STATUS, 1));
