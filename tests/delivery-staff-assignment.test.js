const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');

(async () => {
  const { normalizeDeliveryStaffIds, buildDeliveryStaffLookupFilter } = await import('../src/utils/delivery-staff-ids.ts');

  test('normalizeDeliveryStaffIds accepts valid ObjectId strings and legacy ids', () => {
    assert.deepEqual(normalizeDeliveryStaffIds('507f1f77bcf86cd799439011'), ['507f1f77bcf86cd799439011']);
    assert.deepEqual(normalizeDeliveryStaffIds(['507f1f77bcf86cd799439011', 'legacy-2', '  ', null]), ['507f1f77bcf86cd799439011', 'legacy-2']);
  });

  test('buildDeliveryStaffLookupFilter combines ObjectId and legacy id lookups', () => {
    const filter = buildDeliveryStaffLookupFilter('507f1f77bcf86cd799439011');
    assert.equal(filter.role, 'DELIVERY_STAFF');
    assert.equal(filter.accountStatus, 'ACTIVE');
    assert.deepEqual(filter.$or, [
      { _id: { $in: [new ObjectId('507f1f77bcf86cd799439011')] } },
      { id: { $in: ['507f1f77bcf86cd799439011'] } },
    ]);
  });
})();
