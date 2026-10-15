import { projectPath, addReadTool, addListTool, addWriteTool, addDeleteTool } from './shared.mjs';

const list = { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false };
const tag = { type: 'object', required: ['project_id', 'tag_name'], properties: { project_id: { type: 'string' }, tag_name: { type: 'string' } }, additionalProperties: false };

export function registerTagTools(registry, { client, guard, config }) {
  addListTool(registry, { name: 'gitlab_list_tags', description: 'List repository tags.', schema: list, guard, client, config, request: a => ({ method: 'GET', path: `/projects/${projectPath(a.project_id)}/repository/tags` }), title: 'GitLab Tags' });
  addReadTool(registry, { name: 'gitlab_get_tag', description: 'Get a single repository tag.', schema: tag, guard, client, config, request: a => ({ method: 'GET', path: `/projects/${projectPath(a.project_id)}/repository/tags/${encodeURIComponent(a.tag_name)}` }), title: 'Repository Tag' });
  addWriteTool(registry, { name: 'gitlab_create_tag', description: 'Create a tag from a branch, tag, or commit SHA; message creates an annotated tag and release_description stores release notes.', schema: { type: 'object', required: ['project_id', 'tag_name', 'ref'], properties: { project_id: { type: 'string' }, tag_name: { type: 'string' }, ref: { type: 'string' }, message: { type: 'string' }, release_description: { type: 'string' } }, additionalProperties: false }, guard, client, config, request: a => { const { project_id, ...body } = a; return { method: 'POST', path: `/projects/${projectPath(project_id)}/repository/tags`, body }; }, title: 'Created Repository Tag' });
  addDeleteTool(registry, { name: 'gitlab_delete_tag', description: 'Delete a repository tag.', schema: tag, guard, client, config, request: a => ({ method: 'DELETE', path: `/projects/${projectPath(a.project_id)}/repository/tags/${encodeURIComponent(a.tag_name)}` }), title: 'Deleted Repository Tag' });
}
