# Orchestration

Use this project as a local agent skill. Agents may read local files and produce plans or content. They must not perform external writes, publish posts, send email, mutate CRM records, or call live connector APIs unless a human approves a separate execution step.

## Workflow

1. Gather local inputs.
2. Run the CLI against fixtures or the target local path.
3. Review JSON/Markdown output.
4. Record verification commands in release-candidate notes.
