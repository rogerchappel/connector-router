# PRD: connector-router

Status: in-progress
Decision: build now

## Scorecard

Total: 90/100
Band: build now
Last scored: 2026-06-02
Scored by: Neo

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 19/20 | Agents need a safe way to choose and validate external actions. |
| Demand signal | 18/20 | Connector platforms, MCP servers, and workflow automation are active categories. |
| V1 buildability | 17/20 | Can start as local manifests plus dry-run validation. |
| Differentiation | 14/15 | Safety-first action routing for agents, not a full automation platform. |
| Agentic workflow leverage | 15/15 | Core infrastructure for "agent meets workflow automation." |
| Distribution potential | 7/10 | Useful public primitive for agent builders. |

## Pitch

A local action router that lets agents map an intent to a connector, validate fields, dry-run, and require approval before side effects.

## Why It Matters

The hard part of "connects to everything" is not only APIs. It is safe action selection, field validation, auditability, and approval boundaries.

## V1 Scope

- Define connector/action manifests.
- Match intent to candidate action with deterministic rules.
- Validate required fields and side-effect level.
- Produce dry-run plan and audit log.
- Refuse execution unless explicitly approved.

## Out of Scope

- OAuth hosting.
- Large connector marketplace.
- Direct production writes in V1.

## CLI/API Sketch

```bash
connector-router plan "create a CRM follow-up task" --catalog connectors/
connector-router validate plan.json
```

## Verification

- Fixture connector catalog.
- Tests for missing fields, unsafe actions, and approval requirements.

## Agent Prompt

Build `connector-router` as a local-first safety layer for agent connector selection and dry-run planning.
