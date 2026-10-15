export class ConfigError extends Error {
  constructor(message) { super(message); this.name = 'ConfigError'; }
}

export function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(PRIVATE[-_]?TOKEN|GITLAB_PRIVATE_TOKEN)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}
