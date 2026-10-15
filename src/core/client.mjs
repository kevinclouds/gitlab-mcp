import { API_PREFIX } from './constants.mjs';
import { safeErrorMessage } from './errors.mjs';

export function normalizePagination(headers, items, requestedLimit, currentPage = 1) {
  const count = Array.isArray(items) ? items.length : 0;
  const nextRaw = headers.get('x-next-page');
  const nextPage = nextRaw && /^\d+$/.test(nextRaw) && Number.isSafeInteger(Number(nextRaw)) && Number(nextRaw) > currentPage ? Number(nextRaw) : null;
  return { count, hasMore: nextPage !== null, nextOffset: nextPage === null ? null : Math.max(0, nextPage - 1) * requestedLimit };
}

function errorFor(status, body) {
  const map = { 401: ['AUTHENTICATION_FAILED', 'GitLab authentication failed'], 403: ['PERMISSION_DENIED', 'GitLab permission denied'], 404: ['NOT_FOUND', 'GitLab resource not found'], 409: ['CONFLICT', 'GitLab request conflicts with current state'], 429: ['RATE_LIMITED', 'GitLab rate limit exceeded'] };
  const [code, message] = map[status] ?? (status >= 500 ? ['GITLAB_SERVER_ERROR', `GitLab server error (${status})`] : ['GITLAB_REQUEST_FAILED', `GitLab request failed (${status})`]);
  const error = new Error(body === undefined || body === null || body === '' ? message : `${message}: ${errorDetail(body)}`);
  error.code = code;
  error.status = status;
  error.details = typeof body === 'object' ? body : undefined;
  return error;
}

function errorDetail(body) {
  const detail = typeof body === 'string' ? body : typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : JSON.stringify(body);
  return detail.length > 300 ? `${detail.slice(0, 300)}...` : detail;
}

async function readLimited(response, responseType, limit, signal) {
  if (!response.body) return responseType === 'binary' ? Buffer.alloc(0) : '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let length = 0;
  const abort = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const chunk = responseType === 'binary' ? (value ?? Buffer.alloc(0)) : decoder.decode(value, { stream: !done });
      length += chunk.length;
      if (length > limit) {
        await reader.cancel();
        const error = new Error('GitLab response exceeded configured character limit');
        error.code = 'RESPONSE_TOO_LARGE';
        throw error;
      }
      chunks.push(chunk);
      if (done) break;
    }
    return responseType === 'binary' ? Buffer.concat(chunks) : chunks.join('');
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

function toFormData(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) form.append(key, value.join(','));
    else if (typeof value === 'object' && typeof value.base64 === 'string') form.append(key, new Blob([Buffer.from(value.base64, 'base64')], { type: value.contentType ?? 'application/octet-stream' }), value.fileName ?? key);
    else form.append(key, String(value));
  }
  return form;
}

export function createGitLabClient(config, fetchImpl = fetch) {
  return {
    async request({ method = 'GET', path, query, body, form, responseType = 'json' }) {
      if (!path?.startsWith('/')) throw new Error('GitLab API path must start with /');
      const url = new URL(`${config.url}${API_PREFIX}${path}`);
      for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) for (const item of value) url.searchParams.append(`${key}[]`, String(item));
        else url.searchParams.set(key, String(value));
      }
      const isForm = form !== undefined;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      try {
        const response = await fetchImpl(url.toString(), { method, signal: controller.signal, headers: { Accept: responseType === 'binary' ? 'application/octet-stream' : 'application/json', 'PRIVATE-TOKEN': config.token, ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }) }, body: isForm ? toFormData(form) : body === undefined ? undefined : JSON.stringify(body) });
        const contentType = response.headers.get('content-type') ?? null;
        if (responseType === 'binary') {
          const bytes = await readLimited(response, 'binary', config.maxResponseChars, controller.signal);
          if (!response.ok) throw errorFor(response.status, new TextDecoder().decode(bytes));
          return { data: Buffer.from(bytes), contentType, status: response.status, headers: response.headers, pagination: normalizePagination(response.headers, [], Number(query?.per_page ?? query?.limit ?? 20), Number(query?.page ?? 1)) };
        }
        const text = await readLimited(response, 'text', config.maxResponseChars, controller.signal);
        let data = text;
        if (responseType !== 'text') try { data = text ? JSON.parse(text) : null; } catch { /* preserve non-JSON text for status mapping */ }
        if (!response.ok) throw errorFor(response.status, data);
        return { data, status: response.status, headers: response.headers, pagination: normalizePagination(response.headers, data, Number(query?.per_page ?? query?.limit ?? 20), Number(query?.page ?? 1)) };
      } catch (error) {
        if (controller.signal.aborted || error?.name === 'AbortError') { const timeout = new Error('GitLab request timed out'); timeout.code = 'TIMEOUT'; throw timeout; }
        if (error?.code) throw error;
        const network = new Error(`GitLab request failed: ${safeErrorMessage(error)}`); network.code = 'NETWORK_ERROR'; throw network;
      } finally { clearTimeout(timer); }
    }
  };
}

export function mapGitLabError(status, body) { return errorFor(status, body); }
