# API

connector-router exposes a small ESM library from `src/index.js` and a CLI from `src/cli.js`. The public surface is intentionally local-first so agents can call it in dry-run workflows without credentials.

## Stability

The V1 API is suitable for release-candidate testing. Treat output shapes as versioned review artifacts before wiring them into external executors.

## Risk taxonomy

`RISK_ORDER` defines the accepted values in ascending order:
`read`, `draft`, `internal_write`, `external_write`, and `public_publish`.
`planIntent` validates `maxRisk` and the catalog before matching an action.
`validatePlan` performs the same catalog validation before checking a stored
plan. A catalog may be an array of connectors or an object with a `connectors`
array. Connector and action `id` values must be non-empty strings. When
present, `actions`, `keywords`, and `requiredFields` must be arrays;
`keywords` and `requiredFields` may contain only non-empty strings. The two
action metadata arrays are optional.

Malformed shape, unsupported risk values, and missing catalog risks return
`ok: false` with deterministic errors. Planning errors also include
`candidates: []`; catalog validation never attempts keyword matching or field
validation after finding malformed metadata.

The CLI prints those library errors as JSON and exits with status `2`. This
distinguishes a rejected request from CLI usage or file errors, which exit with
status `1`.
