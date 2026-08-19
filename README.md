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
blocking findings. Supported risk values, from least to most privileged, are
`read`, `draft`, `internal_write`, `external_write`, and `public_publish`.
Both catalog actions and `--max-risk` must use one of these exact values.
Unsupported or missing catalog risks, and unsupported `--max-risk` values,
produce an explicit JSON error and exit status `2`; no plan is returned.
Connector IDs must be unique across a catalog, and action IDs must be unique
within each connector. Duplicate identifiers are rejected before matching or
saved-plan validation.

## Library API

The package provides an ESM entry point for planning and validating routes:

```js
import { planIntent, validatePlan } from "connector-router";
```

See [docs/API.md](docs/API.md) for the supported API and validation behavior.

Validate a saved plan against the local connector catalog
before handing it to a downstream approval layer:

```bash
node src/cli.js validate fixtures/plans/crm-task-plan.json --catalog fixtures/connectors
node src/cli.js validate fixtures/plans/social-post-plan.json --catalog fixtures/connectors
```

Validation treats the matched catalog action as authoritative: a saved plan's
`action.risk` must exactly match the catalog risk, and actions cataloged as
`external_write` or `public_publish` must set `requiresApproval` to `true`.
Changing stored plan metadata cannot lower the catalog's approval boundary.
Saved plans must be JSON objects containing an `action` object; if present,
`action.fields` must be an object. Required fields accept only non-empty string
values after trimming whitespace. Malformed plan structure and invalid required
values produce structured JSON errors and exit status `2`.

### CLI errors and exit statuses

`plan` accepts one intent plus `--catalog`, `--fields`, and `--max-risk`.
`validate` accepts one plan file plus `--catalog`. Option names and values are
strict: unknown or repeated options, extra positional arguments, and options
without values print an actionable error followed by the command usage and exit
with status `1`. Validly parsed planning or catalog validation rejections remain
structured JSON responses with status `2`. Successful commands exit `0`.

## Safety notes

This project is local-first. It does not execute external actions or write to live accounts. Outputs are review artifacts that another approval-controlled layer may consume.

Planning rejections that report matched candidates use stable, sorted
`connector.action` identifiers, including when every match exceeds
`--max-risk`. If more than one action matches within `--max-risk`, planning does
not choose by catalog or file order. It exits with status `2` and returns a
clarification result:

```json
{
  "ok": false,
  "errors": ["multiple connector actions match intent; clarify the request"],
  "candidates": ["crm.notify", "support.notify"]
}
```

Clarify the intent until it has one allowed match, then run `plan` again.

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
- `npm run package:smoke` - pack and install the tarball, then verify its library import, CLI, docs, fixtures, policy, and changelog
- `npm run release:check` - npm test && npm run check && npm run build && npm run smoke && npm run package:smoke
