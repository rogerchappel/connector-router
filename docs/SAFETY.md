# Safety

This project is designed for reviewable agent workflows.

- Local file reads are allowed.
- Local artifact writes are allowed when requested.
- Live connector writes, social posts, emails, ticket creation, and CRM mutations are out of scope.
- Approval must happen outside this library before any external side effect. `validatePlan` checks the stored approval flag but does not authenticate an approver or authorize execution; a saved `approved: true` value alone is not evidence of human approval.

Use fixtures for tests and demos. Redact private customer, job, meeting, or account data before adding examples.
