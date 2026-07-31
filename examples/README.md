# Examples

Run the fixture smoke command from the repository root:

```bash
npm run smoke
```

The examples are intentionally offline and deterministic. They are safe to run in CI and agent sandboxes.

Connector fixtures use a non-empty connector `id` and an `actions` array. Each
action has a non-empty `id`, a supported `risk`, and may include `keywords` and
`requiredFields`. When included, those optional fields must be arrays containing
only non-empty strings; omit an unused array instead of supplying a string,
`null`, or mixed values. Invalid fixture catalogs produce a structured
`{ "ok": false, "errors": [...] }` result, and CLI commands exit with status
`2`.
