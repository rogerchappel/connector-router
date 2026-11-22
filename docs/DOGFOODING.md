# Safe catalog dogfooding

This procedure checks whether a public connector catalog can be represented by
connector-router's current local schema. It does **not** call a connector, read
an account, or perform an external action.

## Use only safe inputs

- Select a publicly available catalog or schema whose license permits local
  evaluation. Prefer a published example or repository fixture.
- Do not use customer exports, production account data, credentials, tokens,
  private endpoints, or copied records. Use synthetic values for required
  fields; keep any output local and do not commit unreviewed imported data.
- Work from a local copy and inspect it before invoking the CLI. Only provide
  JSON connector manifests in the catalog directory; this tool is not a general
  schema converter.

## Validate the current supported shape

A connector manifest needs a non-empty `id`, an `actions` array, and for every
action a non-empty `id`, a supported `risk` (`read`, `draft`, `internal_write`,
`external_write`, or `public_publish`), and keywords to match. Required fields
can be supplied synthetically via `--fields`. For example, the repository's
anonymized issue-tracker fixture can be exercised without network access:

```bash
node src/cli.js plan "Please file a bug in the issue tracker" \
  --catalog fixtures/connectors \
  --fields fixtures/fields/issue-tracker.json \
  --max-risk internal_write
```

The command emits a plan only. `internal_write` is still a review artifact; the
library does not execute it. Higher-risk plans require a separate trusted
approval layer and must never be treated as authorization just because a plan
file says `approved: true`.

For each external catalog evaluated, record its public URL and license, date,
which schema elements mapped cleanly, and unsupported elements or limitations.
Do not copy the source catalog wholesale into this repository. If a useful
catalog cannot be represented, document the gap and propose a synthetic,
non-sensitive fixture before expanding the schema. A successful fixture run
only demonstrates compatibility with that example; it is not evidence of
production readiness or live integration.
