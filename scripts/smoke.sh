#!/usr/bin/env bash
set -euo pipefail
node src/cli.js --help >/dev/null
node src/cli.js --version >/dev/null
node src/cli.js plan "create a CRM task" --catalog fixtures/connectors --fields fixtures/fields/crm-task.json --max-risk internal_write >/dev/null
echo smoke ok
