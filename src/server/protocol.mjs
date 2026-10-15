import readline from 'node:readline';

export async function* readMessages(readable) {
  const lines = readline.createInterface({ input: readable, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    try { yield JSON.parse(line); }
    catch { yield { jsonrpc: '2.0', id: null, __parseError: true }; }
  }
}

export function writeMessage(writable, message) {
  writable.write(`${JSON.stringify(message)}\n`);
}
