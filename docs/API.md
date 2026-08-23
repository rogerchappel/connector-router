# API

connector-router exposes a small ESM library from `src/index.js` and a CLI from `src/cli.js`. The public surface is intentionally local-first so agents can call it in dry-run workflows without credentials.

Import the supported public API from the package root:

```js
import { planIntent, validatePlan } from "connector-router";
```

The `src/index.js` path describes the source layout; consumers should use the
package-name import so the published export contract controls resolution.

## Stability

The V1 API is suitable for release-candidate testing. Treat output shapes as versioned review artifacts before wiring them into external executors.

## Risk taxonomy

`RISK_ORDER` defines the accepted values in ascending order:
`read`, `draft`, `internal_write`, `external_write`, and `public_publish`.
`planIntent` validates `maxRisk` and the catalog before matching an action.
Keyword matching is case-insensitive and requires whole word boundaries: normal
punctuation may appear next to a keyword, but a keyword does not match inside a
larger word. Letters, numbers, combining marks, and underscores count as word
characters for this boundary check.
`validatePlan` performs the same catalog validation before checking a stored
plan. A catalog may be an array of connectors or an object with a `connectors`
array. Connector and action `id` values must be non-empty strings. When
present, `actions`, `keywords`, and `requiredFields` must be arrays;
`keywords` and `requiredFields` may contain only non-empty strings. The two
action metadata arrays are optional.

Connector IDs must be unique across the catalog. Action IDs must be unique
within their connector (the same action ID may be used by different
connectors). Duplicate-ID errors identify both the duplicate and original
array locations. Catalog uniqueness is checked before risk validation,
planning, or stored-plan lookup, so ambiguous risk and approval metadata is
never resolved by array order.

Malformed shape, unsupported risk values, and missing catalog risks return
`ok: false` with deterministic errors. Planning errors also include
`candidates: []`; catalog validation never attempts keyword matching or field
validation after finding malformed metadata.

The CLI prints those library errors as JSON and exits with status `2`. This
distinguishes a rejected request from CLI usage or file errors, which exit with
status `1`.

## Planning inputs

`planIntent` requires `intent` to be a non-empty string after trimming and
`fields` to be a plain object (when omitted, it defaults to an empty object).
`null`, arrays, primitives, and empty or whitespace-only intents are rejected
before catalog matching. Invalid inputs return the normal structured planning
result with `ok: false`, deterministic `errors`, and `candidates: []`; they do
not throw type errors. When both inputs are invalid, the intent error appears
before the fields error.

## Multiple matches

Risk filtering happens before action selection. If exactly one matching action
is within `maxRisk`, `planIntent` preserves the normal single-match plan even
when higher-risk actions also matched. If multiple allowed actions match, it
returns a non-success result instead of selecting whichever action appears
first:

```json
{
  "ok": false,
  "errors": ["multiple connector actions match intent; clarify the request"],
  "candidates": ["crm.notify", "support.notify"]
}
```

Candidate identifiers are sorted as `connector.action`, making the result
independent of catalog and directory-entry order. The same format and ordering
applies when all matched actions exceed `maxRisk`, so identical action IDs in
different connectors remain distinguishable. Callers should clarify the intent
and retry rather than execute an arbitrary candidate.

## Stored plans and required fields

`validatePlan` requires a stored plan to be a JSON object with an `action`
object. When present, `action.fields` must also be an object. These structural
checks run before catalog validation, so malformed plans return deterministic
`{ "ok": false, "errors": [...] }` results without attempting catalog lookup.

Every field named by an action's `requiredFields` must have a non-empty string
value after trimming whitespace. Missing properties, `null`, booleans, numbers,
arrays, objects, and empty or whitespace-only strings are reported as
`missing field: <name>`. `planIntent` and `validatePlan` apply this same rule.
