# Changelog

## [Unreleased]

- Validate connector and action identifiers and optional action metadata arrays
  before catalog matching or stored-plan validation.
- Reject unsupported or missing catalog risks and unsupported `--max-risk`
  values before creating or validating plans.
- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Report the packaged CLI version correctly when installed beneath a path containing spaces.
All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-06-29

- Documented the initial local-first connector routing CLI and fixtures.
- Included release readiness checks for tests, syntax validation, smoke coverage, and package contents.
- Published safety, contribution, and repository metadata for release review.
