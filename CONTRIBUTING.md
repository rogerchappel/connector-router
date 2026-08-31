# Contributing

Small, focused pull requests are preferred.

## Local Checks

Run the release-readiness stack before opening a pull request:

```bash
npm ci
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
```

## Safety

`connector-router` produces local dry-run plans only. Do not add behavior that executes connector actions, sends external requests, or writes to live accounts without an explicit design discussion and review.
