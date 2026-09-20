import { ObjectId } from 'mongodb';

export function normalizeDeliveryStaffIds(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];
  const ids = values.flatMap((value) => {
    if (value === null || value === undefined) return [];
    const normalized = String(value).trim();
    if (!normalized) return [];
    return [normalized];
  });
  return [...new Set(ids)];
}

export function shapeDeliveryStaffId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value && typeof value === 'object' && 'toHexString' in value && typeof (value as { toHexString: () => string }).toHexString === 'function') {
    const hex = (value as { toHexString: () => string }).toHexString();
    return hex ? hex.trim() : null;
  }
  return null;
}

export function matchesDeliveryStaffId(staff: { _id?: unknown; id?: unknown; userCode?: unknown }, candidate: unknown): boolean {
  const candidateValue = shapeDeliveryStaffId(candidate);
  if (!candidateValue) return false;

  const candidateSet = new Set<string>([
    candidateValue,
    candidateValue.toLowerCase(),
    candidateValue.toUpperCase(),
  ]);

  const staffValues = [
    shapeDeliveryStaffId(staff._id),
    shapeDeliveryStaffId(staff.id),
    typeof staff.userCode === 'string' ? staff.userCode.trim() : null,
  ].filter((value): value is string => Boolean(value));

  for (const staffValue of staffValues) {
    if (candidateSet.has(staffValue) || candidateSet.has(staffValue.toLowerCase()) || candidateSet.has(staffValue.toUpperCase())) {
      return true;
    }
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
      identityMatches.push({ userCode: { $in: ids } });
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
