import { ObjectId } from 'mongodb';

export function normalizeDeliveryStaffIds(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  const ids = values.flatMap((value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return [];
    const normalized = String(value).trim();
    return normalized ? [normalized] : [];
  });
  return [...new Set(ids)];
}

export function shapeDeliveryStaffId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === 'object' && 'toHexString' in value && typeof (value as { toHexString: () => string }).toHexString === 'function') {
    const hex = (value as { toHexString: () => string }).toHexString();
    return hex || null;
  }
  return null;
}

export function matchesDeliveryStaffId(staff: { _id?: unknown; id?: unknown }, candidate: unknown): boolean {
  const values = new Set<string>();
  const candidateValue = shapeDeliveryStaffId(candidate);
  if (candidateValue) values.add(candidateValue);

  const staffId = shapeDeliveryStaffId(staff._id) || shapeDeliveryStaffId(staff.id);
  if (staffId) values.add(staffId);

  if (candidateValue && staffId) {
    return candidateValue === staffId || candidateValue === staffId.toLowerCase() || candidateValue === staffId.toUpperCase();
  }
  return false;
}

export function buildDeliveryStaffLookupFilter(staffIds: string | string[] | null | undefined) {
  const ids = normalizeDeliveryStaffIds(staffIds);
  const identityMatches: Array<Record<string, unknown>> = [];

  if (ids.length) {
    const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (objectIds.length) {
      identityMatches.push({ _id: { $in: objectIds } });
    }
    if (ids.length) {
      identityMatches.push({ id: { $in: ids } });
    }
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
