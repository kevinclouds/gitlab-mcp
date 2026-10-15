# Security Policy

## Reporting a Vulnerability

Please report security issues by opening a private
[security advisory](https://github.com/kevinclouds/gitlab-mcp/security/advisories)
or by contacting the maintainer directly. Do not open a public issue for
unpublished security problems.

## Token Handling

- The GitLab token is read from the `GITLAB_PRIVATE_TOKEN` environment variable only.
  It is never accepted as a tool argument, written to logs, or included in error messages.
- Errors and diagnostics are written to stderr; stdout carries only MCP JSON-RPC messages.
- Response content is redacted and truncated according to `GITLAB_MAX_RESPONSE_CHARS`.

## Write Protection

- All tools are read-only by default.
- Write operations require `GITLAB_ALLOW_WRITE=true`.
- Delete operations additionally require `GITLAB_ALLOW_DELETE=true`.
- These switches never grant permissions beyond those of the configured token.
