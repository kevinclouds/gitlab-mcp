import { formatResult } from '../core/formatters.mjs';
import { tool, projectPath, addListTool, addWriteTool } from './shared.mjs';

const issue = { type: 'object', required: ['project_id', 'issue_iid'], properties: { project_id: { type: 'string' }, issue_iid: { type: 'integer' } }, additionalProperties: false };
const mr = { type: 'object', required: ['project_id', 'merge_request_iid'], properties: { project_id: { type: 'string' }, merge_request_iid: { type: 'integer' } }, additionalProperties: false };

export function registerTodoTools(registry, { client, guard, config }) {
  addListTool(registry, { name: 'gitlab_list_todos', description: 'List todos of the authenticated user.', schema: { type: 'object', properties: { limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false }, guard, client, config, request: () => ({ method: 'GET', path: '/todos' }), title: 'GitLab Todos' });
  for (const [resource, schema, id, label] of [['issues', issue, 'issue_iid', 'Issue'], ['merge_requests', mr, 'merge_request_iid', 'MR']]) {
    registry.push(tool(`gitlab_create_${resource === 'issues' ? 'issue' : 'merge_request'}_todo`, `Add a ${label} to the todo list of the authenticated user; returns unchanged when a todo already exists.`, schema, async a => {
      guard.assertWrite();
      try {
        const r = await client.request({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/${resource}/${a[id]}/todo` });
        return formatResult(r.data, { maxChars: config.maxResponseChars, title: `${label} Todo` });
      } catch (error) {
        if (error.status !== 304) throw error;
        return formatResult({ unchanged: true }, { maxChars: config.maxResponseChars, title: `${label} Todo` });
      }
    }, { readOnlyHint: false, idempotentHint: true }));
  }
  addWriteTool(registry, { name: 'gitlab_mark_todo_done', description: 'Mark a todo as done; this does not close the related issue or merge request.', schema: { type: 'object', required: ['todo_id'], properties: { todo_id: { type: 'integer', minimum: 1 } }, additionalProperties: false }, guard, client, config, request: a => ({ method: 'POST', path: `/todos/${a.todo_id}/mark_as_done` }), title: 'Completed Todo' });
  addWriteTool(registry, { name: 'gitlab_mark_all_todos_done', description: 'Mark all todos of the authenticated user as done; this does not close the related issues or merge requests.', schema: { type: 'object', properties: {}, additionalProperties: false }, guard, client, config, request: () => ({ method: 'POST', path: '/todos/mark_as_done' }), title: 'Completed All Todos' });
}
