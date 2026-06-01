# connector-router

Use this skill when an agent needs to Map intents to connector actions, validate required fields, and emit approval-aware dry-run plans.

## Required inputs

- Local files only for V1.
- No credentials are required.
- Fixture data is preferred for tests and demos.

## Side-effect boundaries

The skill may read local files and write local output artifacts. It must not call live external services, post content, send messages, create tickets, or mutate remote systems. Any future executor must require a separate human approval step.

## Verification

Run `npm test`, `npm run check`, `npm run build`, and `npm run smoke` before using release-candidate output.

## Example

```bash
npm run smoke
```
