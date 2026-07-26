# API

connector-router exposes a small ESM library from `src/index.js` and a CLI from `src/cli.js`. The public surface is intentionally local-first so agents can call it in dry-run workflows without credentials.

## Stability

The V1 API is suitable for release-candidate testing. Treat output shapes as versioned review artifacts before wiring them into external executors.

## Risk taxonomy

`RISK_ORDER` defines the accepted values in ascending order:
`read`, `draft`, `internal_write`, `external_write`, and `public_publish`.
`planIntent` validates `maxRisk` and every catalog action risk before matching
an action. `validatePlan` likewise validates every catalog action risk before
checking a stored plan. Unsupported values and missing catalog risks return
`ok: false` with deterministic `unsupported ... risk` errors.

The CLI prints those library errors as JSON and exits with status `2`. This
distinguishes a rejected request from CLI usage or file errors, which exit with
status `1`.
