import { ObjectId } from 'mongodb';

export function normalizeDeliveryStaffIds(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  const ids = values.flatMap((value) => {
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  });
  return [...new Set(ids)];
}

export function buildDeliveryStaffLookupFilter(staffIds: string | string[] | null | undefined) {
  const ids = normalizeDeliveryStaffIds(staffIds);
  const identityMatches: Array<Record<string, unknown>> = [];

  if (ids.length) {
    const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (objectIds.length) {
      identityMatches.push({ _id: { $in: objectIds } });
    }
    identityMatches.push({ id: { $in: ids } });
  }

  const baseFilter: Record<string, unknown> = {
    role: 'DELIVERY_STAFF',
    accountStatus: 'ACTIVE',
  };

  if (identityMatches.length) {
    baseFilter.$or = identityMatches;
  }

  return baseFilter;
}
