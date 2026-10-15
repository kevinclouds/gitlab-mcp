import { formatResult } from '../core/formatters.mjs';
import { tool, projectPath, listResult, addWriteTool, addDeleteTool } from './shared.mjs';

const groupFields = { name: { type: 'string' }, path: { type: 'string' }, description: { type: 'string' }, visibility: { type: 'string' }, lfs_enabled: { type: 'boolean' }, request_access_enabled: { type: 'boolean' }, share_with_group_lock: { type: 'boolean' } };
const group = { type: 'object', required: ['group_id'], properties: { group_id: { type: 'string' } }, additionalProperties: false };
const projectFilters = {
  archived: { type: 'boolean' },
  visibility: { type: 'string' },
  search: { type: 'string' },
  order_by: { type: 'string', enum: ['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at'] },
  sort: { type: 'string', enum: ['asc', 'desc'] },
  simple: { type: 'boolean' },
  owned: { type: 'boolean' },
  starred: { type: 'boolean' }
};
const issueFilters = {
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

export function registerGroupTools(registry, { client, guard, config }) {
  registry.push(tool('gitlab_list_groups', 'List groups accessible to the authenticated user; filter by search, ownership, and skip lists.', { type: 'object', properties: { search: { type: 'string' }, skip_groups: { type: 'array', items: { type: 'integer' } }, all_available: { type: 'boolean' }, owned: { type: 'boolean' }, statistics: { type: 'boolean' }, order_by: { type: 'string', enum: ['name', 'path'] }, sort: { type: 'string', enum: ['asc', 'desc'] }, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const { limit, offset, response_format, ...query } = args; const response = await client.request({ method: 'GET', path: '/groups', query: { ...query, ...pageQuery(args) } }); return listResult(response, args, 'GitLab Groups', config.maxResponseChars); }));
  registry.push(tool('gitlab_get_group', 'Get a group by ID or URL-encoded path.', { ...group, properties: { ...group.properties, response_format: { type: 'string' } } }, async args => { guard.assertRead(); const response = await client.request({ method: 'GET', path: `/groups/${projectPath(args.group_id)}` }); return formatResult(response.data, { format: args.response_format, maxChars: config.maxResponseChars, title: 'GitLab Group' }); }));
  registry.push(tool('gitlab_list_group_projects', 'List projects in a group with visibility, ownership, and order filters.', { type: 'object', required: ['group_id'], properties: { group_id: { type: 'string' }, ...projectFilters, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const { group_id, limit, offset, response_format, ...query } = args; const response = await client.request({ method: 'GET', path: `/groups/${projectPath(group_id)}/projects`, query: { ...query, ...pageQuery(args) } }); return listResult(response, args, 'GitLab Group Projects', config.maxResponseChars); }));
  registry.push(tool('gitlab_list_group_issues', 'List issues across projects in a group.', { type: 'object', required: ['group_id'], properties: { group_id: { type: 'string' }, search: { type: 'string' }, ...issueFilters, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const { group_id, limit, offset, response_format, ...query } = args; const response = await client.request({ method: 'GET', path: `/groups/${projectPath(group_id)}/issues`, query: { ...query, scope: args.scope ?? 'all', ...pageQuery(args) } }); return listResult(response, args, 'Group Issues', config.maxResponseChars); }));
  addWriteTool(registry, { name: 'gitlab_create_group', description: 'Create a group; pass parent_id to create a subgroup.', schema: { type: 'object', required: ['name', 'path'], properties: { ...groupFields, parent_id: { type: 'integer' } }, additionalProperties: false }, guard, client, config, request: a => ({ method: 'POST', path: '/groups', body: a }), title: 'Created GitLab Group' });
  addWriteTool(registry, { name: 'gitlab_update_group', description: 'Update a group name, path, description, visibility, LFS, access request setting, or share lock. GitLab 10.1.1 resets visibility to the instance default when visibility is omitted, so pass the current visibility explicitly when the group contains projects with higher visibility.', schema: { ...group, properties: { ...group.properties, ...groupFields } }, guard, client, config, method: 'PUT', request: a => { const { group_id, ...body } = a; return { method: 'PUT', path: `/groups/${projectPath(group_id)}`, body }; }, title: 'Updated GitLab Group' });
  addDeleteTool(registry, { name: 'gitlab_delete_group', description: 'Delete a group.', schema: group, guard, client, config, request: a => ({ method: 'DELETE', path: `/groups/${projectPath(a.group_id)}` }), title: 'Deleted GitLab Group' });
}
