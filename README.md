# connector-router

Safety-first local action router for agent connector selection and dry-run planning.

## Quickstart

```bash
npm install
npm run smoke
```

## CLI

```bash
node src/cli.js plan "create a CRM task" --catalog fixtures/connectors --fields fixtures/fields/crm-task.json --max-risk internal_write
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
bash scripts/validate.sh
```
