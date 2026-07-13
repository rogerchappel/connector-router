# connector-router

Safety-first local action router for agent connector selection and dry-run planning.

## Quickstart

```bash
npm install
npm run smoke
```

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run release:check
npm pack --dry-run
```

## CLI

```bash
connector-router --help
node src/cli.js plan "create a CRM task" --catalog fixtures/connectors --fields fixtures/fields/crm-task.json --max-risk internal_write
```

The `plan` command prints JSON with either an approved dry-run action or
blocking findings. Validate a saved plan against the local connector catalog
before handing it to a downstream approval layer:

```bash
node src/cli.js validate fixtures/plans/crm-task-plan.json --catalog fixtures/connectors
```

## Safety notes

This project is local-first. It does not execute external actions or write to live accounts. Outputs are review artifacts that another approval-controlled layer may consume.

## Limitations

- V1 uses deterministic local parsing.
- Fixtures are intentionally small.
- Human review is required before any generated plan or content is used externally.

## Verify

Run local verification before opening a PR or publishing:

```bash
npm test
npm run check
npm run lint
npm run release:check
```

## Development

Run the same checks locally before opening a PR:

- `npm run check` - node --check src/*.js test/*.test.js
- `npm run lint` - alias for the static check
- `npm run build` - node scripts/validate.js
- `npm test` - node --test
- `npm run smoke` - bash scripts/smoke.sh
- `npm run package:smoke` - npm pack --dry-run with required CLI, docs, fixtures, policy, and changelog checks
- `npm run release:check` - npm test && npm run check && npm run build && npm run smoke && npm run package:smoke
