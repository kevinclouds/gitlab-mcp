import { formatResult } from '../core/formatters.mjs';
import { tool, projectPath, listResult, addReadTool, addListTool, addWriteTool, addDeleteTool } from './shared.mjs';

const issue = { type: 'object', required: ['project_id', 'issue_iid'], properties: { project_id: { type: 'string' }, issue_iid: { type: 'integer' } }, additionalProperties: false };
const time = { ...issue };
const duration = { ...time, required: ['project_id', 'issue_iid', 'duration'], properties: { ...time.properties, duration: { type: 'string' } } };
const issueFields = { assignee_ids: { type: 'array', items: { type: 'integer' } }, assignee_id: { type: 'integer' }, milestone_id: { type: 'integer' }, labels: { type: 'string' }, due_date: { type: 'string' }, confidential: { type: 'boolean' }, discussion_locked: { type: 'boolean' } };
const filters = {
  state: { type: 'string', enum: ['opened', 'closed', 'all'] },
  labels: { type: 'string' },
  milestone: { type: 'string' },
  order_by: { type: 'string', enum: ['created_at', 'updated_at'] },
  sort: { type: 'string', enum: ['asc', 'desc'] },
  iids: { type: 'array', items: { type: 'integer' } },
  created_after: { type: 'string' },
  created_before: { type: 'string' },
  author_id: { type: 'integer' },
  assignee_id: { type: 'integer' },
  scope: { type: 'string', enum: ['created-by-me', 'assigned-to-me', 'all'] },
  my_reaction_emoji: { type: 'string' }
};
const pageQuery = a => ({ page: 1 + Math.floor((a.offset ?? 0) / (a.limit ?? 20)), per_page: a.limit ?? 20 });
const listQuery = a => { const { project_id, limit, offset, response_format, ...query } = a; return { ...query, ...pageQuery(a) }; };

export function registerIssueTools(registry, { client, guard, config }) {
  registry.push(tool('gitlab_list_issues', 'List issues of a project with filters for state, labels, milestone, author, assignee, and dates.', { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' }, search: { type: 'string' }, ...filters, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const response = await client.request({ method: 'GET', path: `/projects/${projectPath(args.project_id)}/issues`, query: listQuery(args) }); return listResult(response, args, 'GitLab Issues', config.maxResponseChars); }));
  registry.push(tool('gitlab_get_issue', 'Get an issue of a project.', issue, async args => { guard.assertRead(); const response = await client.request({ method: 'GET', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}` }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'GitLab Issue' }); }));
  registry.push(tool('gitlab_create_issue', 'Create an issue in a project.', { type: 'object', required: ['project_id', 'title'], properties: { project_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, ...issueFields, created_at: { type: 'string' }, merge_request_to_resolve_discussions_of: { type: 'integer' }, discussion_to_resolve: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertWrite(); const { project_id, ...body } = args; const response = await client.request({ method: 'POST', path: `/projects/${projectPath(project_id)}/issues`, body }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Created GitLab Issue' }); }, { readOnlyHint: false, idempotentHint: false }));
  registry.push(tool('gitlab_update_issue', 'Update an issue title, description, state, assignees, milestone, labels, due date, or confidentiality.', { type: 'object', required: ['project_id', 'issue_iid'], properties: { project_id: { type: 'string' }, issue_iid: { type: 'integer' }, title: { type: 'string' }, description: { type: 'string' }, state_event: { type: 'string', enum: ['reopen', 'close'] }, ...issueFields, updated_at: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertWrite(); const { project_id, issue_iid, ...body } = args; const response = await client.request({ method: 'PUT', path: `/projects/${projectPath(project_id)}/issues/${issue_iid}`, body }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Updated GitLab Issue' }); }, { readOnlyHint: false, idempotentHint: true }));
  registry.push(tool('gitlab_close_issue', 'Close an issue of a project.', issue, async args => { guard.assertWrite(); const response = await client.request({ method: 'PUT', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}`, body: { state_event: 'close' } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Closed GitLab Issue' }); }, { readOnlyHint: false, idempotentHint: true }));
  registry.push(tool('gitlab_reopen_issue', 'Reopen a closed issue of a project.', issue, async args => { guard.assertWrite(); const response = await client.request({ method: 'PUT', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}`, body: { state_event: 'reopen' } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Reopened GitLab Issue' }); }, { readOnlyHint: false, idempotentHint: true }));
  addDeleteTool(registry, { name: 'gitlab_delete_issue', description: 'Delete an issue of a project; requires project owner or admin permission.', schema: issue, guard, client, config, request: a => ({ method: 'DELETE', path: `/projects/${projectPath(a.project_id)}/issues/${a.issue_iid}` }), title: 'Deleted GitLab Issue' });
  addWriteTool(registry, { name: 'gitlab_move_issue', description: 'Move an issue to another project; requires access to both projects.', schema: { type: 'object', required: ['project_id', 'issue_iid', 'to_project_id'], properties: { project_id: { type: 'string' }, issue_iid: { type: 'integer' }, to_project_id: { type: 'integer' } }, additionalProperties: false }, guard, client, config, request: a => ({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/issues/${a.issue_iid}/move`, body: { to_project_id: a.to_project_id } }), title: 'Moved GitLab Issue' });

  addListTool(registry, { name: 'gitlab_list_all_issues', description: 'List issues across all projects visible to the authenticated user, scope defaults to all.', schema: { type: 'object', properties: { ...filters, search: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' } }, additionalProperties: false }, guard, client, config, request: a => { const { limit, offset, response_format, ...query } = a; return { method: 'GET', path: '/issues', query: { ...query, scope: a.scope ?? 'all', ...pageQuery(a) } }; }, title: 'All Issues' });
  addListTool(registry, { name: 'gitlab_list_issue_closing_merge_requests', description: 'List merge requests that will close an issue when merged.', schema: issue, guard, client, config, request: a => ({ method: 'GET', path: `/projects/${projectPath(a.project_id)}/issues/${a.issue_iid}/closed_by`, query: pageQuery(a) }), title: 'Issue Closing Merge Requests' });

  addReadTool(registry, { name: 'gitlab_get_issue_time_stats', description: 'Get time tracking statistics of an issue.', schema: time, guard, client, config, request: a => ({ method: 'GET', path: `/projects/${projectPath(a.project_id)}/issues/${a.issue_iid}/time_stats` }), title: 'Issue Time Stats' });
  registry.push(tool('gitlab_set_issue_time_estimate', 'Set the time estimate of an issue.', duration, async args => { guard.assertWrite(); const response = await client.request({ method: 'POST', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}/time_estimate`, query: { duration: args.duration } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Issue Time Estimate' }); }, { readOnlyHint: false }));
  registry.push(tool('gitlab_reset_issue_time_estimate', 'Reset the time estimate of an issue.', time, async args => { guard.assertWrite(); const response = await client.request({ method: 'POST', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}/reset_time_estimate` }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Issue Time Estimate Reset' }); }, { readOnlyHint: false }));
  registry.push(tool('gitlab_add_issue_spent_time', 'Record time spent on an issue.', duration, async args => { guard.assertWrite(); const response = await client.request({ method: 'POST', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}/add_spent_time`, query: { duration: args.duration } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Issue Spent Time' }); }, { readOnlyHint: false }));
  registry.push(tool('gitlab_reset_issue_spent_time', 'Reset the total time spent on an issue.', time, async args => { guard.assertWrite(); const response = await client.request({ method: 'POST', path: `/projects/${projectPath(args.project_id)}/issues/${args.issue_iid}/reset_spent_time` }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Issue Spent Time Reset' }); }, { readOnlyHint: false }));

  for (const [action, description, subscribed] of [['subscribe', 'Subscribe to issue notifications.', true], ['unsubscribe', 'Unsubscribe from issue notifications.', false]]) {
    registry.push(tool(`gitlab_${action}_issue`, description, issue, async a => {
      guard.assertWrite();
      try {
        const r = await client.request({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/issues/${a.issue_iid}/${action}` });
        return formatResult(r.data, { maxChars: config.maxResponseChars, title: description });
      } catch (error) {
        if (error.status !== 304) throw error;
        return formatResult({ subscribed, unchanged: true }, { maxChars: config.maxResponseChars, title: description });
      }
    }, { readOnlyHint: false, idempotentHint: true }));
  }
}
