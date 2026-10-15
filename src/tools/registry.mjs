export function createToolRegistry({ client, config, guard, modules = [] }) {
  const registry = [];
  const deps = { client, config, guard, register: tool => registry.push(tool) };
  for (const register of modules) register(registry, deps);
  return registry.sort((a, b) => a.name.localeCompare(b.name));
}
