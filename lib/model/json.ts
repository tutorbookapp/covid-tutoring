export function isJSON(json: unknown): json is Record<string, unknown> {
  return typeof json === 'object' && json !== null;
}

export function isArray<T>(
  json: unknown,
  isType?: (json: unknown) => json is T
): json is T[] {
  if (!(json instanceof Array)) return false;
  if (!isType) return true;
  if (json.some((val) => !isType(val))) return false;
  return true;
}

export function isStringArray(json: unknown): json is string[] {
  return isArray(json, (val): val is string => typeof val === 'string');
}

export function isDateJSON(json: unknown): json is string {
  if (typeof json !== 'string') return false;
  if (new Date(json).toString() === 'Invalid Date') return false;
  return true;
}

export function isNumberJSON(json: unknown): json is string {
  if (typeof json !== 'string') return false;
  if (Number(json).toString() !== json) return false;
  return true;
}
