export function formatResult(data, { format = 'markdown', maxChars = 25000, title = 'GitLab result' } = {}) {
  const original = format === 'text' ? String(data ?? '') : format === 'json' ? JSON.stringify(data, null, 2) : `# ${title}\n\n${markdown(data)}`;
  if (original.length <= maxChars) return { content: [{ type: 'text', text: original }], ...(data !== null && typeof data === 'object' && !Array.isArray(data) ? { structuredContent: data } : {}) };
  const truncated = { truncated: true, truncation_message: 'Response truncated; use pagination or narrower filters.' };
  const text = format === 'json' ? JSON.stringify({ truncated: true, truncation_message: truncated.truncation_message }) : `# ${title}\n\nResponse truncated; use pagination or narrower filters.`;
  return { content: [{ type: 'text', text }], structuredContent: truncated };
}
function markdown(value) {
  if (Array.isArray(value)) return value.map(item => `- ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `- **${key}**: ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n');
  return String(value ?? '');
}
