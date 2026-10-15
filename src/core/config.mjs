import { DEFAULT_MAX_RESPONSE_CHARS, DEFAULT_TIMEOUT_MS } from './constants.mjs';
import { ConfigError } from './errors.mjs';

function bool(value) { return String(value ?? '').toLowerCase() === 'true'; }
function positive(name, value, fallback) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new ConfigError(`${name} must be a positive integer`);
  return number;
}

export function loadConfig(env = process.env) {
  const rawUrl = env.GITLAB_URL;
  if (!rawUrl) throw new ConfigError('GITLAB_URL is required');
  if (!env.GITLAB_PRIVATE_TOKEN) throw new ConfigError('GITLAB_PRIVATE_TOKEN is required');
  let url;
  try { url = new URL(rawUrl).toString().replace(/\/$/, ''); }
  catch { throw new ConfigError('GITLAB_URL must be a valid URL'); }
  return {
    url,
    token: env.GITLAB_PRIVATE_TOKEN,
    allowWrite: bool(env.GITLAB_ALLOW_WRITE),
    allowDelete: bool(env.GITLAB_ALLOW_DELETE),
    requestTimeoutMs: positive('GITLAB_REQUEST_TIMEOUT_MS', env.GITLAB_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxResponseChars: positive('GITLAB_MAX_RESPONSE_CHARS', env.GITLAB_MAX_RESPONSE_CHARS, DEFAULT_MAX_RESPONSE_CHARS)
  };
}
