# GitLab MCP Server

MCP server that turns the GitLab REST API v4 into tools for AI clients. It targets older self-hosted GitLab instances that the official GitLab MCP server does not support, and is verified against **GitLab 10.1.1 CE**.

[简体中文](README.zh-CN.md)

## Features

- **157 tools** covering projects, groups, members, access requests, issues, merge requests, notes, repository files and blobs, branches, protected branches, commits, tags, labels, milestones, snippets, users, SSH keys, todos, events, and instance metadata
- **Zero runtime dependencies** — Node.js 20+ built-ins only
- **Read-only by default** — write and delete operations require explicit environment opt-in
- **Bounded pagination** and response size limits with structured error codes
- **Token safety** — the token is only read from the environment, never logged, and redacted from errors; stdout carries only MCP JSON-RPC messages
- **Native 10.1.1 behavior** — tools call real 10.1.1 endpoints only; APIs that this version does not implement are not exposed

## Requirements

- Node.js 20 or later
- A GitLab personal access token with the `api` scope (older GitLab versions call this a Private Token)
- Network access from the machine running the server to the GitLab instance

## Installation

### npx from this repository

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "--package=github:kevinclouds/gitlab-mcp#main", "gitlab-mcp"],
      "env": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_PRIVATE_TOKEN": "<your token>"
      }
    }
  }
}
```

`npx` downloads the repository over Git, so the machine needs Git access to GitHub. A released tag can be pinned with `#<tag>` instead of `#main`.

### From a local checkout

```bash
export GITLAB_URL='https://gitlab.example.com'
export GITLAB_PRIVATE_TOKEN='<your token>'
node src/index.mjs
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITLAB_URL` | yes | — | GitLab instance root URL, without `/api/v4` |
| `GITLAB_PRIVATE_TOKEN` | yes | — | Personal access token |
| `GITLAB_ALLOW_WRITE` | no | `false` | Enable create and update tools |
| `GITLAB_ALLOW_DELETE` | no | `false` | Enable delete tools (also requires write) |
| `GITLAB_REQUEST_TIMEOUT_MS` | no | `30000` | Per-request timeout in milliseconds |
| `GITLAB_MAX_RESPONSE_CHARS` | no | `25000` | Text response size limit; binary responses are limited by bytes |

The server also requires a `GITLAB_URL` and `GITLAB_PRIVATE_TOKEN`. The token is never accepted as a tool argument and never printed; error messages replace it with `[REDACTED]`.

### Pagination and output

List tools accept `limit` (1–100, default 20) and `offset`. Offset must be a multiple of `limit`; use the `nextOffset` returned in the result and keep the same `limit` while paging. Text results default to Markdown; pass `response_format: "json"` for JSON.

## Tools

157 tools grouped by GitLab API domain.

### Instance & Metadata (8)

| Tool | Type | Description |
|---|---|---|
|`gitlab_get_version`|Read|Get the GitLab version and revision of the target instance.|
|`gitlab_list_events`|Read|List activity events visible to the authenticated user; filter by action, target type, or date range.|
|`gitlab_get_notification_settings`|Read|Get notification settings of the authenticated user.|
|`gitlab_get_project_notification_settings`|Read|Get notification settings of the authenticated user for a project; defaults to the global level.|
|`gitlab_update_project_notification_settings`|Write|Update notification settings of the authenticated user for a project: level and per-event email switches.|
|`gitlab_get_group_notification_settings`|Read|Get notification settings of the authenticated user for a group; defaults to the global level.|
|`gitlab_update_group_notification_settings`|Write|Update notification settings of the authenticated user for a group: level and per-event email switches.|
|`gitlab_update_notification_settings`|Write|Update notification settings of the authenticated user: global level, notification email, and per-event email switches.|

### Projects & Namespaces (11)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_projects`|Read|List projects accessible to the authenticated user with visibility, ownership, and feature filters.|
|`gitlab_get_project`|Read|Get a project by ID or URL-encoded path, for example group%2Fproject.|
|`gitlab_create_project`|Write|Create a project; namespace_id selects the target namespace, import_url imports a repository, and avatar accepts base64 image data.|
|`gitlab_update_project`|Write|Update a project name, path, default branch, description, visibility, feature switches, merge settings, or avatar (base64 image data).|
|`gitlab_delete_project`|Delete|Delete a project with its repository and related resources; GitLab 10.1.1 processes deletion asynchronously, so a successful response does not mean background cleanup has finished.|
|`gitlab_star_project`|Write|Star a project for the authenticated user.|
|`gitlab_unstar_project`|Write|Unstar a project for the authenticated user.|
|`gitlab_archive_project`|Delete|Archive a project to make it read-only.|
|`gitlab_unarchive_project`|Write|Unarchive a project.|
|`gitlab_list_project_users`|Read|List users of a project, optionally filtered by name or username.|
|`gitlab_list_namespaces`|Read|List namespaces available to the authenticated user, for example for creating projects.|

### Groups (7)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_groups`|Read|List groups accessible to the authenticated user; filter by search, ownership, and skip lists.|
|`gitlab_get_group`|Read|Get a group by ID or URL-encoded path.|
|`gitlab_list_group_projects`|Read|List projects in a group with visibility, ownership, and order filters.|
|`gitlab_list_group_issues`|Read|List issues across projects in a group.|
|`gitlab_create_group`|Write|Create a group; pass parent_id to create a subgroup.|
|`gitlab_update_group`|Write|Update a group name, path, description, visibility, LFS, access request setting, or share lock. GitLab 10.1.1 resets visibility to the instance default when visibility is omitted, so pass the current visibility explicitly when the group contains projects with higher visibility.|
|`gitlab_delete_group`|Delete|Delete a group.|

### Members (10)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_project_members`|Read|List direct members of a project with their access levels.|
|`gitlab_get_project_member`|Read|Get a single project member with access level and expiry.|
|`gitlab_add_project_member`|Write|Add a member to a project with an access level.|
|`gitlab_update_project_member`|Write|Update a project member access level or expiry.|
|`gitlab_remove_project_member`|Delete|Remove a member from a project.|
|`gitlab_list_group_members`|Read|List direct members of a group with their access levels.|
|`gitlab_get_group_member`|Read|Get a single group member with access level and expiry.|
|`gitlab_add_group_member`|Write|Add a member to a group with an access level.|
|`gitlab_update_group_member`|Write|Update a group member access level or expiry.|
|`gitlab_remove_group_member`|Delete|Remove a member from a group. GitLab returns an empty body on success; null represents no response data, not a failure.|

### Access Requests (8)

| Tool | Type | Description |
|---|---|---|
|`gitlab_request_project_access`|Write|Request membership in a project for the authenticated user; the project must allow access requests and the user must not already be a member.|
|`gitlab_list_project_access_requests`|Read|List pending access requests of a project.|
|`gitlab_approve_project_access_request`|Write|Approve a project access request; pass access_level to set the member role (default 30).|
|`gitlab_deny_project_access_request`|Delete|Deny and remove a project access request.|
|`gitlab_request_group_access`|Write|Request membership in a group for the authenticated user; the group must allow access requests and the user must not already be a member.|
|`gitlab_list_group_access_requests`|Read|List pending access requests of a group.|
|`gitlab_approve_group_access_request`|Write|Approve a group access request; pass access_level to set the member role (default 30).|
|`gitlab_deny_group_access_request`|Delete|Deny and remove a group access request.|

### Issues (17)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_issues`|Read|List issues of a project with filters for state, labels, milestone, author, assignee, and dates.|
|`gitlab_get_issue`|Read|Get an issue of a project.|
|`gitlab_create_issue`|Write|Create an issue in a project.|
|`gitlab_update_issue`|Write|Update an issue title, description, state, assignees, milestone, labels, due date, or confidentiality.|
|`gitlab_close_issue`|Write|Close an issue of a project.|
|`gitlab_reopen_issue`|Write|Reopen a closed issue of a project.|
|`gitlab_delete_issue`|Delete|Delete an issue of a project; requires project owner or admin permission.|
|`gitlab_move_issue`|Write|Move an issue to another project; requires access to both projects.|
|`gitlab_list_all_issues`|Read|List issues across all projects visible to the authenticated user, scope defaults to all.|
|`gitlab_list_issue_closing_merge_requests`|Read|List merge requests that will close an issue when merged.|
|`gitlab_get_issue_time_stats`|Read|Get time tracking statistics of an issue.|
|`gitlab_set_issue_time_estimate`|Write|Set the time estimate of an issue.|
|`gitlab_reset_issue_time_estimate`|Write|Reset the time estimate of an issue.|
|`gitlab_add_issue_spent_time`|Write|Record time spent on an issue.|
|`gitlab_reset_issue_spent_time`|Write|Reset the total time spent on an issue.|
|`gitlab_subscribe_issue`|Write|Subscribe to issue notifications.|
|`gitlab_unsubscribe_issue`|Write|Unsubscribe from issue notifications.|

### Merge Requests (22)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_merge_requests`|Read|List merge requests of a project with filters for state, labels, milestone, author, assignee, and dates.|
|`gitlab_get_merge_request`|Read|Get a merge request of a project.|
|`gitlab_create_merge_request`|Write|Create a merge request from a source branch to a target branch.|
|`gitlab_update_merge_request`|Write|Update a merge request title, description, target branch, state, assignee, labels, milestone, source branch removal, or discussion lock.|
|`gitlab_merge_merge_request`|Delete|Merge a merge request; the request must be in a mergeable state. Pass sha to require the current HEAD of the source branch.|
|`gitlab_close_merge_request`|Write|Close a merge request without merging it.|
|`gitlab_reopen_merge_request`|Write|Reopen a closed merge request.|
|`gitlab_cancel_merge_when_pipeline_succeeds`|Write|Cancel merge when pipeline succeeds for a merge request; the merge request must currently be in that state (GitLab 10.1.1 returns a server error otherwise).|
|`gitlab_delete_merge_request`|Delete|Delete a merge request; requires sufficient project permissions.|
|`gitlab_list_all_merge_requests`|Read|List merge requests across all projects visible to the authenticated user, scope defaults to all.|
|`gitlab_list_merge_request_changes`|Read|Get the file changes of a merge request; GitLab 10.1.1 returns the merge request with its changes array inline.|
|`gitlab_list_merge_request_commits`|Read|List the commits of a merge request.|
|`gitlab_list_merge_request_versions`|Read|List the diff versions of a merge request, one per push.|
|`gitlab_get_merge_request_version`|Read|Get a specific diff version of a merge request.|
|`gitlab_list_merge_request_closing_issues`|Read|List issues that will close automatically when the merge request is merged.|
|`gitlab_get_merge_request_time_stats`|Read|Get time tracking statistics of a merge request.|
|`gitlab_set_merge_request_time_estimate`|Write|Set the time estimate of a merge request.|
|`gitlab_reset_merge_request_time_estimate`|Write|Reset the time estimate of a merge request.|
|`gitlab_add_merge_request_spent_time`|Write|Record time spent on a merge request.|
|`gitlab_reset_merge_request_spent_time`|Write|Reset the total time spent on a merge request.|
|`gitlab_subscribe_merge_request`|Write|Subscribe to merge request notifications.|
|`gitlab_unsubscribe_merge_request`|Write|Unsubscribe from merge request notifications.|

### Notes (10)

| Tool | Type | Description |
|---|---|---|
|`gitlab_add_issue_note`|Write|Add a note to an issue.|
|`gitlab_list_issue_notes`|Read|List notes of an issue.|
|`gitlab_get_issue_note`|Read|Get a single note of an issue.|
|`gitlab_update_issue_note`|Write|Update a note of an issue.|
|`gitlab_delete_issue_note`|Delete|Delete a note of an issue.|
|`gitlab_add_merge_request_note`|Write|Add a note to a merge request.|
|`gitlab_list_merge_request_notes`|Read|List notes of a merge request.|
|`gitlab_get_merge_request_note`|Read|Get a single note of a merge request.|
|`gitlab_update_merge_request_note`|Write|Update a note of a merge request.|
|`gitlab_delete_merge_request_note`|Delete|Delete a note of a merge request.|

### Repository Files & Blobs (10)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_repository_files`|Read|List repository files and directories; ref selects a branch or tag, recursive lists all nested entries.|
|`gitlab_get_repository_file`|Read|Get file content and metadata from a repository at a given ref.|
|`gitlab_get_raw_repository_file`|Read|Get raw file content from a repository as plain text.|
|`gitlab_create_repository_file`|Write|Create a file in a repository; start_branch creates a new branch, encoding base64 handles binary content.|
|`gitlab_update_repository_file`|Write|Update an existing repository file; last_commit_id guards against overwriting concurrent changes, encoding base64 handles binary content.|
|`gitlab_delete_repository_file`|Delete|Delete a file from a repository branch.|
|`gitlab_get_repository_archive`|Read|Download a repository archive and return it as Base64. Supported formats: tar.gz, tar, tar.bz2, tb2, tbz, tbz2, bz2, zip.|
|`gitlab_get_repository_blob`|Read|Get a repository blob by SHA with Base64 content and metadata.|
|`gitlab_get_raw_repository_blob`|Read|Get raw blob bytes by SHA and return them as Base64; supports binary files.|
|`gitlab_list_repository_contributors`|Read|List repository contributors with commit counts.|

### Branches & Protected Branches (8)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_branches`|Read|List repository branches.|
|`gitlab_get_branch`|Read|Get a repository branch with its latest commit.|
|`gitlab_create_branch`|Write|Create a branch from a branch, tag, or commit SHA.|
|`gitlab_delete_branch`|Delete|Delete a repository branch.|
|`gitlab_list_protected_branches`|Read|List protected branches of a project.|
|`gitlab_get_protected_branch`|Read|Get a single protected branch.|
|`gitlab_create_protected_branch`|Write|Protect a project branch; push and merge access levels accept 0 (no access), 30 (developer), or 40 (master).|
|`gitlab_delete_protected_branch`|Delete|Remove protection from a project branch.|

### Commits (8)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_commits`|Read|List repository commits; ref_name selects a branch or tag, path filters by file.|
|`gitlab_create_commit`|Write|Create a commit with one or more file actions (create, create_dir, update, move, delete) on a branch; content is required for create, update, and move; start_branch creates the branch when it does not exist.|
|`gitlab_get_commit`|Read|Get a single commit with author, message, and stats.|
|`gitlab_get_commit_diff`|Read|Get the file diffs of a commit.|
|`gitlab_list_commit_comments`|Read|List comments of a commit.|
|`gitlab_add_commit_comment`|Write|Add a comment to a commit; pass path, line, and line_type to comment on a specific diff line.|
|`gitlab_cherry_pick_commit`|Write|Cherry-pick a commit onto a target branch; the branch must exist and the change must apply cleanly.|
|`gitlab_compare_commits`|Read|Compare two branches, tags, or commit SHAs and return commits and file diffs.|

### Tags (4)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_tags`|Read|List repository tags.|
|`gitlab_get_tag`|Read|Get a single repository tag.|
|`gitlab_create_tag`|Write|Create a tag from a branch, tag, or commit SHA; message creates an annotated tag and release_description stores release notes.|
|`gitlab_delete_tag`|Delete|Delete a repository tag.|

### Labels (4)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_project_labels`|Read|List labels of a project.|
|`gitlab_create_project_label`|Write|Create a project label.|
|`gitlab_update_project_label`|Write|Update a project label; name identifies the label and new_name renames it.|
|`gitlab_delete_project_label`|Delete|Delete a project label by name.|

### Milestones (12)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_project_milestones`|Read|List milestones of a project; filter by state, IIDs, or search text.|
|`gitlab_get_project_milestone`|Read|Get a single project milestone.|
|`gitlab_create_project_milestone`|Write|Create a project milestone.|
|`gitlab_update_project_milestone`|Write|Update a project milestone; state_event closes or activates it.|
|`gitlab_list_group_milestones`|Read|List milestones of a group; filter by state, IIDs, or search text.|
|`gitlab_get_group_milestone`|Read|Get a single group milestone.|
|`gitlab_create_group_milestone`|Write|Create a group milestone.|
|`gitlab_update_group_milestone`|Write|Update a group milestone; state_event closes or activates it.|
|`gitlab_list_project_milestone_issues`|Read|List issues assigned to a project milestone.|
|`gitlab_list_project_milestone_merge_requests`|Read|List merge requests assigned to a project milestone.|
|`gitlab_list_group_milestone_issues`|Read|List issues assigned to a group milestone.|
|`gitlab_list_group_milestone_merge_requests`|Read|List merge requests assigned to a group milestone.|

### Snippets (6)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_project_snippets`|Read|List snippets of a project.|
|`gitlab_get_project_snippet`|Read|Get a single project snippet.|
|`gitlab_get_project_snippet_raw`|Read|Get the raw content of a project snippet as plain text.|
|`gitlab_create_project_snippet`|Write|Create a project snippet; visibility is required in GitLab 10.1.1.|
|`gitlab_update_project_snippet`|Write|Update a project snippet; the API requires at least one of title, file_name, or code to be provided.|
|`gitlab_delete_project_snippet`|Delete|Delete a project snippet.|

### Users & SSH Keys (7)

| Tool | Type | Description |
|---|---|---|
|`gitlab_get_current_user`|Read|Get the authenticated GitLab user.|
|`gitlab_get_user`|Read|Get a GitLab user by ID.|
|`gitlab_list_users`|Read|List GitLab users; filter by username, search, state flags, or creation date.|
|`gitlab_list_user_ssh_keys`|Read|List SSH keys of the authenticated user.|
|`gitlab_get_user_ssh_key`|Read|Get an SSH key of the authenticated user by ID.|
|`gitlab_add_user_ssh_key`|Write|Add an SSH key to the authenticated user.|
|`gitlab_delete_user_ssh_key`|Delete|Delete an SSH key of the authenticated user.|

### Todos (5)

| Tool | Type | Description |
|---|---|---|
|`gitlab_list_todos`|Read|List todos of the authenticated user.|
|`gitlab_create_issue_todo`|Write|Add a Issue to the todo list of the authenticated user; returns unchanged when a todo already exists.|
|`gitlab_create_merge_request_todo`|Write|Add a MR to the todo list of the authenticated user; returns unchanged when a todo already exists.|
|`gitlab_mark_todo_done`|Write|Mark a todo as done; this does not close the related issue or merge request.|
|`gitlab_mark_all_todos_done`|Write|Mark all todos of the authenticated user as done; this does not close the related issues or merge requests.|

## Security

- All tools are read-only until `GITLAB_ALLOW_WRITE=true` is set. Deletes additionally require `GITLAB_ALLOW_DELETE=true`. These switches only gate tool availability; they never grant permissions beyond those of the configured token.
- The token is read from `GITLAB_PRIVATE_TOKEN` only. It is not accepted as a tool argument, not written to logs, and replaced with `[REDACTED]` in error messages.
- Responses that exceed `GITLAB_MAX_RESPONSE_CHARS` are cut off with an explicit truncation notice; oversized streaming responses are aborted while reading.
- See [SECURITY.md](SECURITY.md) for reporting.

## Project Structure

```text
src/
├── index.mjs              # stdio entry point: wiring only
├── version.mjs            # server name and version
├── server/                # MCP protocol layer
│   ├── server.mjs         # initialize / tools/list / tools/call dispatch
│   ├── protocol.mjs       # newline-delimited JSON-RPC over stdio
│   └── schemas.mjs        # argument validation
├── core/                  # GitLab integration
│   ├── client.mjs         # REST client: auth, timeout, pagination, size limits
│   ├── config.mjs         # environment configuration
│   ├── constants.mjs      # protocol and API constants
│   ├── errors.mjs         # error types and token redaction
│   ├── formatters.mjs     # markdown / json / text output
│   └── guard.mjs          # read / write / delete permission checks
└── tools/                 # one module per GitLab API domain
    ├── shared.mjs         # tool helpers (schemas, pagination, registration)
    ├── registry.mjs       # tool registry
    └── <domain>.mjs       # projects, groups, issues, merge-requests, ...
```

## Development

```bash
npm run build   # syntax-check every source file
npm start       # start the stdio server
```

The MCP server communicates over stdio, so it is normally launched by an MCP client rather than run by hand.

## Compatibility

Built and verified against **GitLab 10.1.1 CE**. Tools map one-to-one to endpoints that this version implements; features introduced in later GitLab versions (for example merge request approvals, deploy tokens, or protected tags) are not exposed as tools. The server does not retry failed writes automatically.

## License

[MIT](LICENSE)
