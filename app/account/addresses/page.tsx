import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { listAddressesForUser } from '@/src/models/address';
import AddressForm from '@/src/components/account/address-form';
import { CustomerShell } from '@/src/app-shell';

export default async function AddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const addresses = await listAddressesForUser(user._id!.toHexString());

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Addresses</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Your saved delivery locations</h1>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Add an address</h2>
            <div className="mt-4"><AddressForm /></div>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Saved addresses</h2>
            <div className="mt-4">
              {addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-sm text-stone-600">No addresses yet.</div> : (
                <ul className="space-y-3">
                  {addresses.map((address) => (
                    <li key={address.id || address._id?.toHexString()} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="font-semibold text-stone-900">{address.label || address.addressLine1}</div>
                      <div className="mt-1 text-sm text-stone-600">{address.addressLine1}, {address.city}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
