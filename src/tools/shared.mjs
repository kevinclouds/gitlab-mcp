import { formatResult } from '../core/formatters.mjs';

export const projectListSchema = { type: 'object', required: ['project_id'], properties: { project_id: { type: 'string' }, limit: { type: 'integer' }, offset: { type: 'integer' }, response_format: { type: 'string' } }, additionalProperties: false };

export function tool(name, description, inputSchema, handler, annotations = {}) {
  const properties = Object.fromEntries(Object.entries(inputSchema.properties ?? {}).map(([key, original]) => {
    const rule = { ...original };
    if (key === 'limit') Object.assign(rule, { minimum: 1, maximum: 100 });
    if (key === 'offset') Object.assign(rule, { minimum: 0, description: 'Offset must be a multiple of limit (default 20); use nextOffset.' });
    if (rule.type === 'integer' && /_(id|iid)$/.test(key)) rule.minimum ??= 1;
    if (rule.type === 'string' && /^(project_id|group_id|name|title|path|file_path|branch|branch_name|source_branch|target_branch|ref|sha|from|to|tag_name|body|note|key|duration|commit_message)$/.test(key)) Object.assign(rule, { minLength: 1, pattern: '\\S' });
    if (key === 'response_format') rule.enum = ['markdown', 'json'];
    if (key === 'visibility') rule.enum = ['private', 'internal', 'public'];
    if (key === 'encoding') rule.enum = ['base64'];
    return [key, rule];
  }));
  inputSchema = { ...inputSchema, properties };
  return { name, title: description, description, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true, ...annotations }, handler };
}

export function projectPath(value) { return encodeURIComponent(String(value)); }

export function listResult(response, args, title, maxChars) {
  const items = Array.isArray(response.data) ? response.data : (response.data?.items ?? []);
  return formatResult({ items, ...(response.pagination ?? {}) }, { format: args.response_format, maxChars, title });
}

export function addReadTool(registry, { name, description, schema, guard, client, config, request, title = description }) {
  registry.push(tool(name, description, schema, async args => { guard.assertRead(); const options = request(args); const response = await client.request(options); return formatResult(response.data, { format: options.responseType === 'text' ? 'text' : args.response_format, maxChars: config.maxResponseChars, title }); }));
}

export function addListTool(registry, { name, description, schema = projectListSchema, guard, client, config, request, title = description }) {
  schema = { ...schema, properties: { ...schema.properties, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0 }, response_format: { type: 'string' } } };
  registry.push(tool(name, description, schema, async args => { guard.assertRead(); const options = request(args); options.query = { ...options.query, page: 1 + Math.floor((args.offset ?? 0) / (args.limit ?? 20)), per_page: args.limit ?? 20 }; const response = await client.request(options); return listResult(response, args, title, config.maxResponseChars); }));
}

export function addWriteTool(registry, { name, description, schema, guard, client, config, method = 'POST', request, title = description, destructiveHint = false }) {
  registry.push(tool(name, description, schema, async args => { if (method === 'DELETE') guard.assertDelete(); else guard.assertWrite(); const response = await client.request(request(args)); return formatResult(response.data, { format: args.response_format, maxChars: config.maxResponseChars, title }); }, { readOnlyHint: false, destructiveHint, idempotentHint: method !== 'POST' }));
}

export function addDeleteTool(registry, options) {
  addWriteTool(registry, { ...options, method: 'DELETE', destructiveHint: true, request: options.request, title: options.title ?? options.description });
}
