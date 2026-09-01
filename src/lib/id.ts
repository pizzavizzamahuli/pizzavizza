export function getIdString(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    const record = value as { toHexString?: () => string; _id?: unknown };
    if (typeof record.toHexString === 'function') {
      return record.toHexString();
    }

    if (record._id && typeof record._id === 'object') {
      const nested = record._id as { toHexString?: () => string };
      if (typeof nested.toHexString === 'function') {
        return nested.toHexString();
      }
    }
  }

  return '';
}
