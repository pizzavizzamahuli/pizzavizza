'use client';

import { useEffect, useMemo, useState } from 'react';

type CustomerUser = {
  id: string;
  userCode?: string;
  name: string;
  email: string;
  mobile?: string | null;
  role: string;
  accountStatus: string;
  protected?: boolean;
  createdAt?: string;
};

const availableStatuses = ['ACTIVE', 'PENDING', 'DISABLED', 'SUSPENDED'] as const;

export default function CustomerManagementPanel() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?role=CUSTOMER');
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || 'Unable to load customer accounts.');
        setUsers([]);
        return;
      }
      setUsers(json.data || []);
      setMessage(null);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      setMessage('Unable to load customer accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The fetchCustomers function updates component state from its async result.
    // This call is intentionally placed inside an effect to load data on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCustomers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const haystack = [user.userCode || '', user.id, user.name, user.email, user.mobile || '', user.role, user.accountStatus]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, users]);

  async function handleStatusChange(userId: string, status: string) {
    setMessage(null);
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || 'Unable to update customer account.');
        return;
      }
      setMessage('Customer status updated successfully.');
      await fetchCustomers();
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(userId: string) {
    const confirmed = window.confirm('Delete this customer account? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || 'Unable to delete customer account.');
        return;
      }
      setMessage('Customer account deleted.');
      await fetchCustomers();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Customer Accounts</h2>
          <p className="mt-1 text-sm text-stone-600">Search customers and update status or remove invalid accounts.</p>
        </div>
        <div className="w-full max-w-md">
          <label className="sr-only" htmlFor="customer-search">Search customers</label>
          <input
            id="customer-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, mobile, or user id"
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none ring-0 placeholder:text-stone-400 focus:border-amber-500"
          />
        </div>
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</div> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">User ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">Loading customers…</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">No customers match your search.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-4 font-mono text-xs font-semibold text-stone-700">{user.userCode || '—'}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-stone-900">{user.name}</div>
                    <div className="text-xs text-stone-500">{user.role}</div>
                  </td>
                  <td className="px-4 py-4 text-stone-700">{user.email}</td>
                  <td className="px-4 py-4 text-stone-700">{user.mobile || '—'}</td>
                  <td className="px-4 py-4">
                    <select
                      value={user.accountStatus}
                      disabled={Boolean(user.protected) || savingId === user.id}
                      onChange={(event) => handleStatusChange(user.id, event.target.value)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      disabled={Boolean(user.protected) || savingId === user.id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === user.id ? 'Working…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
