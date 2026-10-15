import { formatResult } from '../core/formatters.mjs';
import { tool, projectPath, listResult, addListTool, addWriteTool, addDeleteTool } from './shared.mjs';

const orderBy = ['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at'];
const avatarProp = { type: 'string', description: 'Avatar image as base64 data URL (data:image/png;base64,...) or raw base64; PNG/JPG/GIF/WebP, max 200KB.' };
const avatarTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
function parseAvatar(value) {
  const match = String(value).match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (match) {
    if (!avatarTypes[match[1]]) throw new Error(`avatar content type not supported: ${match[1]} (use PNG/JPG/GIF/WebP)`);
    return { fileName: `avatar.${avatarTypes[match[1]]}`, contentType: match[1], base64: match[2] };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(String(value))) return { fileName: 'avatar.png', contentType: 'image/png', base64: String(value) };
  throw new Error('avatar must be a base64 data URL or raw base64 string');
}
const projectFilters = {
  archived: { type: 'boolean' },
  visibility: { type: 'string' },
  search: { type: 'string' },
  owned: { type: 'boolean' },
  starred: { type: 'boolean' },
  membership: { type: 'boolean' },
  with_issues_enabled: { type: 'boolean' },
  with_merge_requests_enabled: { type: 'boolean' },
  order_by: { type: 'string', enum: orderBy },
  sort: { type: 'string', enum: ['asc', 'desc'] },
  statistics: { type: 'boolean' },
  simple: { type: 'boolean' }
};
const projectSettings = {
  description: { type: 'string' },
  ci_config_path: { type: 'string' },
  issues_enabled: { type: 'boolean' },
  merge_requests_enabled: { type: 'boolean' },
  wiki_enabled: { type: 'boolean' },
  jobs_enabled: { type: 'boolean' },
  snippets_enabled: { type: 'boolean' },
  shared_runners_enabled: { type: 'boolean' },
  resolve_outdated_diff_discussions: { type: 'boolean' },
  container_registry_enabled: { type: 'boolean' },
  lfs_enabled: { type: 'boolean' },
  visibility: { type: 'string' },
  public_builds: { type: 'boolean' },
  request_access_enabled: { type: 'boolean' },
  only_allow_merge_if_pipeline_succeeds: { type: 'boolean' },
  only_allow_merge_if_all_discussions_are_resolved: { type: 'boolean' },
  tag_list: { type: 'array', items: { type: 'string' } },
  printing_merge_request_link_enabled: { type: 'boolean' }
};
const project = { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' } }, additionalProperties: false };

export function registerProjectTools(registry, { client, guard, config }) {
  registry.push(tool('gitlab_list_projects', 'List projects accessible to the authenticated user with visibility, ownership, and feature filters.', { type: 'object', properties: { ...projectFilters, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0 }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const { limit, offset, response_format, ...query } = args; const response = await client.request({ method: 'GET', path: '/projects', query: { ...query, per_page: limit ?? 20, page: Math.floor((offset ?? 0) / (limit ?? 20)) + 1 } }); return listResult(response, args, 'GitLab Projects', config.maxResponseChars); }));
  registry.push(tool('gitlab_get_project', 'Get a project by ID or URL-encoded path, for example group%2Fproject.', { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' }, statistics: { type: 'boolean' }, response_format: { type: 'string' } }, additionalProperties: false }, async args => { guard.assertRead(); const response = await client.request({ method: 'GET', path: `/projects/${projectPath(args.project_id)}`, query: { statistics: args.statistics } }); return formatResult(response.data, { format: args.response_format, maxChars: config.maxResponseChars, title: 'GitLab Project' }); }));
  registry.push(tool('gitlab_create_project', 'Create a project; namespace_id selects the target namespace, import_url imports a repository, and avatar accepts base64 image data.', { type: 'object', required: ['name'], properties: { name: { type: 'string' }, path: { type: 'string' }, namespace_id: { type: 'integer' }, import_url: { type: 'string' }, ...projectSettings, avatar: avatarProp }, additionalProperties: false }, async args => { guard.assertWrite(); const { avatar, ...rest } = args; const response = await client.request(avatar === undefined ? { method: 'POST', path: '/projects', body: rest } : { method: 'POST', path: '/projects', form: { ...rest, avatar: parseAvatar(avatar) } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Created GitLab Project' }); }, { readOnlyHint: false, idempotentHint: false }));
  registry.push(tool('gitlab_update_project', 'Update a project name, path, default branch, description, visibility, feature switches, merge settings, or avatar (base64 image data).', { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' }, name: { type: 'string' }, path: { type: 'string' }, default_branch: { type: 'string' }, ...projectSettings, avatar: avatarProp }, additionalProperties: false }, async args => { guard.assertWrite(); const { project_id, avatar, ...rest } = args; const response = await client.request(avatar === undefined ? { method: 'PUT', path: `/projects/${projectPath(project_id)}`, body: rest } : { method: 'PUT', path: `/projects/${projectPath(project_id)}`, form: { ...rest, avatar: parseAvatar(avatar) } }); return formatResult(response.data, { maxChars: config.maxResponseChars, title: 'Updated GitLab Project' }); }, { readOnlyHint: false, idempotentHint: true }));
  addDeleteTool(registry, { name: 'gitlab_delete_project', description: 'Delete a project with its repository and related resources; GitLab 10.1.1 processes deletion asynchronously, so a successful response does not mean background cleanup has finished.', schema: project, guard, client, config, request: a => ({ method: 'DELETE', path: `/projects/${projectPath(a.project_id)}` }), title: 'Deleted GitLab Project' });
  for (const [action, description, key, value] of [['star', 'Star a project for the authenticated user.', 'starred', true], ['unstar', 'Unstar a project for the authenticated user.', 'starred', false]]) {
    registry.push(tool(`gitlab_${action}_project`, description, project, async a => {
      guard.assertWrite();
      try {
        const r = await client.request({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/${action}` });
        return formatResult(r.data, { maxChars: config.maxResponseChars, title: description });
      } catch (error) {
        if (error.status !== 304) throw error;
        return formatResult({ [key]: value, unchanged: true }, { maxChars: config.maxResponseChars, title: description });
      }
    }, { readOnlyHint: false, idempotentHint: true }));
  }
  addWriteTool(registry, { name: 'gitlab_archive_project', description: 'Archive a project to make it read-only.', schema: project, guard, client, config, destructiveHint: true, request: a => ({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/archive` }) });
  addWriteTool(registry, { name: 'gitlab_unarchive_project', description: 'Unarchive a project.', schema: project, guard, client, config, request: a => ({ method: 'POST', path: `/projects/${projectPath(a.project_id)}/unarchive` }) });
  addListTool(registry, { name: 'gitlab_list_project_users', description: 'List users of a project, optionally filtered by name or username.', schema: { ...project, properties: { ...project.properties, search: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' } } }, guard, client, config, request: a => ({ method: 'GET', path: `/projects/${projectPath(a.project_id)}/users`, query: { search: a.search } }), title: 'Project Users' });
  addListTool(registry, { name: 'gitlab_list_namespaces', description: 'List namespaces available to the authenticated user, for example for creating projects.', schema: { type: 'object', properties: { search: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' } }, additionalProperties: false }, guard, client, config, request: a => ({ method: 'GET', path: '/namespaces', query: { search: a.search } }), title: 'GitLab Namespaces' });
}
