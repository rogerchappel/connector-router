# Safety

This project is designed for reviewable agent workflows.

- Local file reads are allowed.
- Local artifact writes are allowed when requested.
- Live connector writes, social posts, emails, ticket creation, and CRM mutations are out of scope.
- Approval must happen outside this library before any external side effect.

Use fixtures for tests and demos. Redact private customer, job, meeting, or account data before adding examples.
