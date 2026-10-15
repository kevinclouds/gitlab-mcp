import { PROTOCOL_VERSION } from '../core/constants.mjs';
import { validate } from './schemas.mjs';
import { safeErrorMessage } from '../core/errors.mjs';
import { NAME, VERSION } from '../version.mjs';

export function createServer({ config = null, tools = [] } = {}) {
  const orderedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  const byName = new Map(orderedTools.map(tool => [tool.name, tool]));
  return {
    config,
    tools: orderedTools,
    async handle(request) {
      if (request?.__parseError) return { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };
      if (request?.jsonrpc !== '2.0' || typeof request?.method !== 'string' || !request.method) return { jsonrpc: '2.0', id: request?.id ?? null, error: { code: -32600, message: 'Invalid Request' } };
      if (!Object.hasOwn(request, 'id') && request.method.startsWith('notifications/')) return null;
      const id = request?.id ?? null;
      if (request.method === 'initialize') return { jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: NAME, version: VERSION } } };
      if (request.method === 'notifications/initialized') return null;
      if (request.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: orderedTools.map(({ handler, ...tool }) => tool) } };
      if (request.method === 'tools/call') {
        const name = request.params?.name;
        const tool = byName.get(name);
        if (!tool) return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${name}` } };
        try { const argumentsValue = validate(tool.inputSchema ?? { type: 'object', properties: {}, additionalProperties: false }, request.params?.arguments ?? {});
          return { jsonrpc: '2.0', id, result: await tool.handler(argumentsValue) }; }
        catch (error) {
          let message = safeErrorMessage(error);
          if (config?.token) message = message.replaceAll(config.token, '[REDACTED]');
          return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: message }], structuredContent: { error: { code: error?.code ?? 'TOOL_ERROR', ...(error?.status === undefined ? {} : { status: error.status }), message, ...(error?.details === undefined ? {} : { details: error.details }) } } } };
        }
      }
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${request.method}` } };
    }
  };
}
