export function createGuard(config) {
  return {
    assertRead() {},
    assertWrite() { if (!config.allowWrite) throw new Error('Write operations are disabled; set GITLAB_ALLOW_WRITE=true'); },
    assertDelete() { if (!config.allowWrite || !config.allowDelete) throw new Error('Delete operations are disabled; set GITLAB_ALLOW_WRITE=true and GITLAB_ALLOW_DELETE=true'); },
    assertApiPath(path, method = 'GET') {
      if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('API path must be relative to /api/v4');
      const normalizedMethod = String(method).toUpperCase();
      if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) throw new Error(`Unsupported HTTP method: ${normalizedMethod}`);
      if (!['GET', 'HEAD'].includes(normalizedMethod)) this.assertWrite();
      if (normalizedMethod === 'DELETE') this.assertDelete();
    }
  };
}
