# GitLab MCP Server

把 GitLab REST API v4 封装为 AI 客户端可调用工具的 MCP 服务，面向官方 MCP 服务不支持的老版本私有部署 GitLab，已在 **GitLab 10.1.1 CE** 上真实验证。

[English](README.md)

## 特性

- **157 个工具**，覆盖项目、Group、成员、访问申请、Issue、Merge Request、评论、仓库文件与 Blob、分支、保护分支、提交、Tag、标签、里程碑、Snippet、用户、SSH Key、待办、事件和实例元数据
- **零运行时依赖**，仅使用 Node.js 20+ 内置能力
- **默认只读**，写入和删除需要显式开启环境变量
- **有界分页**与响应大小限制，错误带结构化错误码
- **Token 安全**：只从环境变量读取，不写入日志，错误信息自动脱敏；stdout 只输出 MCP JSON-RPC 消息
- **严格对应 10.1.1 原生接口**：不注册该版本没有的 API，未做降级替代

## 环境要求

- Node.js 20 或更高版本
- 具有 `api` 权限的 GitLab Personal Token（老版本称为 Private Token）
- 运行服务的机器可以访问 GitLab 实例

## 安装

### 通过 GitHub npx 运行

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "--package=github:kevinclouds/gitlab-mcp#main", "gitlab-mcp"],
      "env": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_PRIVATE_TOKEN": "<你的 Token>"
      }
    }
  }
}
```

`npx` 会通过 Git 下载仓库，机器需要有 GitHub 的 Git 访问权限。可用 `#<tag>` 固定到具体版本。

### 本地运行

```bash
export GITLAB_URL='https://gitlab.example.com'
export GITLAB_PRIVATE_TOKEN='<你的 Token>'
node src/index.mjs
```

## 配置

| 环境变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `GITLAB_URL` | 是 | — | GitLab 实例根地址，不含 `/api/v4` |
| `GITLAB_PRIVATE_TOKEN` | 是 | — | Personal Token |
| `GITLAB_ALLOW_WRITE` | 否 | `false` | 开启创建和修改工具 |
| `GITLAB_ALLOW_DELETE` | 否 | `false` | 开启删除工具（同时需要开启写入） |
| `GITLAB_REQUEST_TIMEOUT_MS` | 否 | `30000` | 单次请求超时（毫秒） |
| `GITLAB_MAX_RESPONSE_CHARS` | 否 | `25000` | 文本响应大小限制；二进制响应按字节限制 |

Token 只从环境变量读取，不作为工具参数传入，也不会出现在日志和错误信息中（会被替换为 `[REDACTED]`）。

### 分页与输出

列表工具支持 `limit`（1–100，默认 20）和 `offset`。offset 必须为 limit 的整数倍，翻页时使用返回的 `nextOffset` 并保持相同 `limit`。文本默认 Markdown 输出；传入 `response_format: "json"` 可获得 JSON。

## 工具清单

共 157 个工具，按 GitLab API 领域分组。

### 实例与元数据（8 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_get_version`|查询|查询 GitLab 版本和代码修订号。|
|`gitlab_list_events`|查询|查询当前用户可访问的活动事件。|
|`gitlab_get_notification_settings`|查询|查询当前用户的 GitLab 通知设置。|
|`gitlab_get_project_notification_settings`|查询|查询当前用户在某个项目上的通知设置；未设置时继承全局级别。|
|`gitlab_update_project_notification_settings`|写入|修改当前用户在某个项目上的通知设置：级别和各事件邮件开关。|
|`gitlab_get_group_notification_settings`|查询|查询当前用户在某个群组上的通知设置；未设置时继承全局级别。|
|`gitlab_update_group_notification_settings`|写入|修改当前用户在某个群组上的通知设置：级别和各事件邮件开关。|
|`gitlab_update_notification_settings`|写入|修改当前用户的通知设置：全局级别、通知邮箱和各事件邮件开关。|

### 项目与命名空间（11 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_projects`|查询|查询可访问项目，可按名称搜索。|
|`gitlab_get_project`|查询|按项目 ID 或完整路径读取项目详情。|
|`gitlab_create_project`|写入|创建 GitLab 项目，可指定所属命名空间。|
|`gitlab_update_project`|写入|修改项目名称、描述或可见性。|
|`gitlab_delete_project`|删除|删除项目及其仓库和关联资源；GitLab 10.1.1 异步执行删除，接口成功不代表后台清理已完成。|
|`gitlab_star_project`|写入|收藏项目。|
|`gitlab_unstar_project`|写入|取消项目收藏。|
|`gitlab_archive_project`|删除|归档项目，限制后续修改，适用于停止维护的项目。|
|`gitlab_unarchive_project`|写入|取消项目归档，恢复正常使用。|
|`gitlab_list_project_users`|查询|查询项目参与用户，可按名称或用户名搜索。|
|`gitlab_list_namespaces`|查询|查询当前用户可访问的命名空间，可按名称搜索。|

### Group（7 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_groups`|查询|查询当前用户可以访问的 Group。|
|`gitlab_get_group`|查询|读取指定 Group 的基本信息。|
|`gitlab_list_group_projects`|查询|查询指定 Group 下的项目。|
|`gitlab_list_group_issues`|查询|跨 Group 下的项目查询 Issue，可按状态、负责人和标签筛选。|
|`gitlab_create_group`|写入|创建 GitLab Group；传入 parent_id 可创建子 Group。|
|`gitlab_update_group`|写入|修改 GitLab Group 的名称、路径、描述或可见性。|
|`gitlab_delete_group`|删除|删除 GitLab Group。|

### 成员（10 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_project_members`|查询|查询项目直接成员及其访问级别。|
|`gitlab_get_project_member`|查询|获取单个项目成员及其权限。|
|`gitlab_add_project_member`|写入|向项目添加成员并设置访问级别。|
|`gitlab_update_project_member`|写入|更新项目成员的访问级别或到期时间。|
|`gitlab_remove_project_member`|删除|移除项目成员。|
|`gitlab_list_group_members`|查询|查询 Group 成员及其访问级别。|
|`gitlab_get_group_member`|查询|读取指定 Group 成员的角色和访问级别。|
|`gitlab_add_group_member`|写入|向 Group 添加成员，设置访问级别和可选到期时间。|
|`gitlab_update_group_member`|写入|修改 Group 成员的访问级别或到期时间。|
|`gitlab_remove_group_member`|删除|移除指定 Group 成员；受 GitLab 角色约束。|

### 访问申请（8 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_request_project_access`|写入|以当前 Token 用户身份申请加入开启访问申请的项目，供项目管理员批准或拒绝。|
|`gitlab_list_project_access_requests`|查询|查询等待处理的项目加入申请。|
|`gitlab_approve_project_access_request`|写入|批准用户加入项目的访问请求。|
|`gitlab_deny_project_access_request`|删除|拒绝并删除用户的项目访问请求。|
|`gitlab_request_group_access`|写入|以当前 Token 用户身份申请加入开启访问申请的 Group，供 Group 管理员批准或拒绝。|
|`gitlab_list_group_access_requests`|查询|查询等待处理的 Group 加入申请。|
|`gitlab_approve_group_access_request`|写入|批准用户加入 Group 的访问申请。|
|`gitlab_deny_group_access_request`|删除|拒绝并删除用户的 Group 访问申请。|

### Issue（17 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_issues`|查询|查询项目 Issue，可按标题和描述中的文字搜索。|
|`gitlab_get_issue`|查询|读取指定 Issue 的详情和状态。|
|`gitlab_create_issue`|写入|在项目中创建 Issue，可填写描述、标签和负责人。|
|`gitlab_update_issue`|写入|修改 Issue 的标题、描述或状态。|
|`gitlab_close_issue`|写入|关闭指定 Issue，保留任务内容和历史记录。|
|`gitlab_reopen_issue`|写入|重新打开已关闭的 Issue。|
|`gitlab_delete_issue`|删除|删除项目中的 Issue；需要项目 Owner 或管理员权限。|
|`gitlab_move_issue`|写入|把 Issue 移动到其他项目；需要对源项目和目标项目都有访问权限。|
|`gitlab_list_all_issues`|查询|按当前账号权限跨项目查询 Issue，默认 scope=all；可按负责人、状态、标签筛选。|
|`gitlab_list_issue_closing_merge_requests`|查询|查询设置为合并后关闭该 Issue 的 MR。|
|`gitlab_get_issue_time_stats`|查询|获取 Issue 工时统计。|
|`gitlab_set_issue_time_estimate`|写入|设置 Issue 预计工时。|
|`gitlab_reset_issue_time_estimate`|写入|重置 Issue 预计工时。|
|`gitlab_add_issue_spent_time`|写入|记录 Issue 实际耗时。|
|`gitlab_reset_issue_spent_time`|写入|重置 Issue 实际耗时。|
|`gitlab_subscribe_issue`|写入|订阅 Issue 更新通知。|
|`gitlab_unsubscribe_issue`|写入|取消 Issue 更新通知订阅。|

### Merge Request（22 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_merge_requests`|查询|查询项目 MR 列表。|
|`gitlab_get_merge_request`|查询|读取指定 MR 的详情、状态和分支信息。|
|`gitlab_create_merge_request`|写入|从源分支向目标分支创建 MR。|
|`gitlab_update_merge_request`|写入|修改 MR 的标题、描述、目标分支、负责人、标签或里程碑。|
|`gitlab_merge_merge_request`|删除|合并指定 MR；需要具备权限且 MR 处于可合并状态。|
|`gitlab_close_merge_request`|写入|关闭指定 MR，不执行合并。|
|`gitlab_reopen_merge_request`|写入|重新打开已关闭的 MR。|
|`gitlab_cancel_merge_when_pipeline_succeeds`|写入|取消 Merge Request 的"流水线成功后自动合并"；MR 需处于该状态。|
|`gitlab_delete_merge_request`|删除|删除 Merge Request；需要足够的项目权限。|
|`gitlab_list_all_merge_requests`|查询|按当前账号权限跨项目查询 MR，默认 scope=all；可按负责人、状态、标签筛选。|
|`gitlab_list_merge_request_changes`|查询|获取 Merge Request 的文件变更。|
|`gitlab_list_merge_request_commits`|查询|列出 Merge Request 的提交。|
|`gitlab_list_merge_request_versions`|查询|查询 MR 每次推送产生的历史 Diff 版本。|
|`gitlab_get_merge_request_version`|查询|读取 MR 指定历史 Diff 版本和文件差异。|
|`gitlab_list_merge_request_closing_issues`|查询|查询 MR 合并后通过 Closes/Fixes 引用自动关闭的 Issue。|
|`gitlab_get_merge_request_time_stats`|查询|获取 Merge Request 工时统计。|
|`gitlab_set_merge_request_time_estimate`|写入|设置 Merge Request 预计工时。|
|`gitlab_reset_merge_request_time_estimate`|写入|重置 Merge Request 预计工时。|
|`gitlab_add_merge_request_spent_time`|写入|记录 Merge Request 实际耗时。|
|`gitlab_reset_merge_request_spent_time`|写入|重置 Merge Request 实际耗时。|
|`gitlab_subscribe_merge_request`|写入|订阅 Merge Request 更新。|
|`gitlab_unsubscribe_merge_request`|写入|取消订阅 Merge Request 更新。|

### 评论（10 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_add_issue_note`|写入|向指定 Issue 添加评论。|
|`gitlab_list_issue_notes`|查询|查询 Issue 的评论列表。|
|`gitlab_get_issue_note`|查询|获取指定 Issue 评论。|
|`gitlab_update_issue_note`|写入|修改 Issue 评论。|
|`gitlab_delete_issue_note`|删除|删除 Issue 评论。|
|`gitlab_add_merge_request_note`|写入|向指定 MR 添加评论。|
|`gitlab_list_merge_request_notes`|查询|查询 Merge Request 的评论列表。|
|`gitlab_get_merge_request_note`|查询|获取指定 Merge Request 评论。|
|`gitlab_update_merge_request_note`|写入|修改 Merge Request 评论。|
|`gitlab_delete_merge_request_note`|删除|删除 Merge Request 评论。|

### 仓库文件与 Blob（10 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_repository_files`|查询|查询仓库默认引用下的根目录文件和子目录。|
|`gitlab_get_repository_file`|查询|读取指定引用下文件的内容、编码和提交元数据。|
|`gitlab_get_raw_repository_file`|查询|读取指定引用下文件的原始文本内容。|
|`gitlab_create_repository_file`|写入|创建仓库文件。|
|`gitlab_update_repository_file`|写入|修改已有仓库文件。|
|`gitlab_delete_repository_file`|删除|从指定分支删除文件并生成提交。|
|`gitlab_get_repository_archive`|查询|获取仓库归档文件并以 Base64 返回。|
|`gitlab_get_repository_blob`|查询|按 Blob SHA 获取文件对象及 Base64 内容。|
|`gitlab_get_raw_repository_blob`|查询|按 Blob SHA 获取原始字节，以 Base64 返回，支持二进制文件。|
|`gitlab_list_repository_contributors`|查询|列出仓库贡献者及其提交统计。|

### 分支与保护分支（8 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_branches`|查询|查询项目的仓库分支列表。|
|`gitlab_get_branch`|查询|获取指定分支详情。|
|`gitlab_create_branch`|写入|从指定分支、Tag 或提交创建分支。|
|`gitlab_delete_branch`|删除|删除指定仓库分支。|
|`gitlab_list_protected_branches`|查询|查询项目受保护分支。|
|`gitlab_get_protected_branch`|查询|获取指定受保护分支。|
|`gitlab_create_protected_branch`|写入|设置项目受保护分支。|
|`gitlab_delete_protected_branch`|删除|取消项目受保护分支设置。|

### 提交（8 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_commits`|查询|查询仓库默认分支的提交历史。|
|`gitlab_create_commit`|写入|将多项文件创建、修改、删除等操作合并为一个提交。|
|`gitlab_get_commit`|查询|读取指定提交的作者、提交信息和统计数据。|
|`gitlab_get_commit_diff`|查询|读取指定提交涉及的文件差异。|
|`gitlab_list_commit_comments`|查询|查询指定提交下的评审评论。|
|`gitlab_add_commit_comment`|写入|对提交发表评论；传入 path、line 和 line_type 可定位 Diff 行。|
|`gitlab_cherry_pick_commit`|写入|将指定提交应用到目标分支；分支需要存在且变更能够无冲突应用。|
|`gitlab_compare_commits`|查询|比较两个分支、Tag 或提交，查看提交及文件差异。|

### Tag（4 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_tags`|查询|查询项目的仓库 Tag 列表。|
|`gitlab_get_tag`|查询|获取指定 Tag 详情。|
|`gitlab_create_tag`|写入|从指定引用创建 Tag。|
|`gitlab_delete_tag`|删除|删除仓库 Tag。|

### 标签（4 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_project_labels`|查询|查询项目标签。|
|`gitlab_create_project_label`|写入|创建项目标签。|
|`gitlab_update_project_label`|写入|修改项目标签。|
|`gitlab_delete_project_label`|删除|删除项目标签。|

### 里程碑（12 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_project_milestones`|查询|查询项目里程碑列表。|
|`gitlab_get_project_milestone`|查询|获取项目中的单个里程碑。|
|`gitlab_create_project_milestone`|写入|创建项目里程碑，设置标题、说明和起止日期。|
|`gitlab_update_project_milestone`|写入|修改项目里程碑的标题、说明和起止日期。|
|`gitlab_list_group_milestones`|查询|查询 Group Milestone。|
|`gitlab_get_group_milestone`|查询|查询 Group Milestone 详情。|
|`gitlab_create_group_milestone`|写入|创建 Group Milestone。|
|`gitlab_update_group_milestone`|写入|修改 Group Milestone。|
|`gitlab_list_project_milestone_issues`|查询|查询项目里程碑中的 Issue。|
|`gitlab_list_project_milestone_merge_requests`|查询|查询项目里程碑中的 MR。|
|`gitlab_list_group_milestone_issues`|查询|查询Group里程碑中的 Issue。|
|`gitlab_list_group_milestone_merge_requests`|查询|查询Group里程碑中的 MR。|

### Snippet（6 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_project_snippets`|查询|查询项目 Snippet。|
|`gitlab_get_project_snippet`|查询|获取项目 Snippet。|
|`gitlab_get_project_snippet_raw`|查询|获取项目 Snippet 原始内容。|
|`gitlab_create_project_snippet`|写入|创建项目 Snippet。|
|`gitlab_update_project_snippet`|写入|修改项目 Snippet。|
|`gitlab_delete_project_snippet`|删除|删除项目 Snippet。|

### 用户与 SSH Key（7 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_get_current_user`|查询|查询当前 Token 对应用户的身份信息。|
|`gitlab_get_user`|查询|按用户 ID 查询用户信息。|
|`gitlab_list_users`|查询|查询 GitLab 用户，可按名称或用户名搜索。|
|`gitlab_list_user_ssh_keys`|查询|查询当前用户 SSH Keys。|
|`gitlab_get_user_ssh_key`|查询|获取当前用户指定 SSH Key。|
|`gitlab_add_user_ssh_key`|写入|为当前用户添加 SSH Key。|
|`gitlab_delete_user_ssh_key`|删除|删除当前用户 SSH Key。|

### 待办（5 个）

| 工具 | 类型 | 说明 |
|---|---|---|
|`gitlab_list_todos`|查询|查询当前用户的 GitLab 待办列表。|
|`gitlab_create_issue_todo`|写入|将 Issue 加入当前账号待办；已有待办时返回 unchanged。|
|`gitlab_create_merge_request_todo`|写入|将 MR 加入当前账号待办；已有待办时返回 unchanged。|
|`gitlab_mark_todo_done`|写入|完成指定 GitLab 待办，不关闭对应 Issue 或 MR。|
|`gitlab_mark_all_todos_done`|写入|将当前用户的全部待办标记为已完成；不关闭对应 Issue 或 MR。|

## 安全

- 所有工具默认只读；写入需要设置 `GITLAB_ALLOW_WRITE=true`，删除还需要 `GITLAB_ALLOW_DELETE=true`。开关只控制工具是否可用，不会获得超出 Token 本身的权限。
- Token 只从 `GITLAB_PRIVATE_TOKEN` 读取，不写入日志，错误信息自动脱敏。
- 响应超过 `GITLAB_MAX_RESPONSE_CHARS` 会截断并给出提示；超大流式响应会在读取过程中中止。
- 漏洞报告方式见 [SECURITY.md](SECURITY.md)。

## 项目结构

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

## 开发

```bash
npm run build   # 对所有源文件做语法检查
npm start       # 启动 stdio 服务
```

服务通过 stdio 通信，通常由 MCP 客户端启动，而不是手动运行。

## 兼容性

基于 **GitLab 10.1.1 CE** 开发并真实验证。工具与该版本实际存在的接口一一对应；更晚版本才引入的能力（如 MR Approval、Deploy Token、Protected Tag 等）不会注册为工具。服务不会自动重试失败的写操作。

## 许可证

[MIT](LICENSE)
