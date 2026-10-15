function fail(message) { throw new Error(`Invalid arguments: ${message}`); }
function check(rule, item, key) {
  if (rule.type === 'string' && typeof item !== 'string') fail(`${key} must be string`);
  if (rule.type === 'integer' && !Number.isSafeInteger(item)) fail(`${key} must be integer`);
  if (rule.type === 'boolean' && typeof item !== 'boolean') fail(`${key} must be boolean`);
  if (rule.type === 'array' && !Array.isArray(item)) fail(`${key} must be array`);
  if (rule.type === 'object' && (typeof item !== 'object' || item === null || Array.isArray(item))) fail(`${key} must be object`);
  if (rule.enum && !rule.enum.includes(item)) fail(`${key} must be one of ${rule.enum.join(', ')}`);
  if (rule.minimum !== undefined && item < rule.minimum) fail(`${key} below minimum`);
  if (rule.maximum !== undefined && item > rule.maximum) fail(`${key} exceeds maximum`);
  if (typeof item === 'string') {
    if (rule.minLength !== undefined && item.length < rule.minLength) fail(`${key} below minimum length`);
    if (rule.pattern && !new RegExp(rule.pattern).test(item)) fail(`${key} has invalid format`);
  }
  if (Array.isArray(item)) {
    if (rule.minItems !== undefined && item.length < rule.minItems) fail(`${key} requires at least ${rule.minItems} items`);
    if (rule.items) item.forEach((value, index) => check(rule.items, value, `${key}[${index}]`));
  }
  if (rule.type === 'object') {
    for (const name of rule.required ?? []) if (!Object.hasOwn(item, name)) fail(`missing ${key}.${name}`);
    if (rule.additionalProperties === false) for (const name of Object.keys(item)) if (!Object.hasOwn(rule.properties ?? {}, name)) fail(`unknown field ${key}.${name}`);
    for (const [name, field] of Object.entries(rule.properties ?? {})) if (Object.hasOwn(item, name)) check(field, item[name], `${key}.${name}`);
  }
}
export function validate(schema, value) {
  if (!schema || schema.type !== 'object') return value;
  check(schema, value, 'arguments');
  if (Object.hasOwn(schema.properties ?? {}, 'offset') && (value.offset ?? 0) % (value.limit ?? 20) !== 0) fail('offset must be a multiple of limit (default 20); use nextOffset');
  return value;
}
