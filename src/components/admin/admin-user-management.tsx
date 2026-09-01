'use client';

import { useEffect, useState } from 'react';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  protected?: boolean;
};

const availableRoles = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'] as const;
const availableStatuses = ['ACTIVE', 'DISABLED', 'SUSPENDED'] as const;

type RoleOption = (typeof availableRoles)[number];
export function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleOption>('ADMIN');
  const [message, setMessage] = useState<string | null>(null);
  const [userUpdates, setUserUpdates] = useState<Record<string, { role: string; accountStatus: string }>>({});
  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers(json.data || []);
        const updates: Record<string, { role: string; accountStatus: string }> = {};
        (json.data || []).forEach((item: UserRow) => {
          updates[item.id] = { role: item.role, accountStatus: item.accountStatus };
        });
        setUserUpdates(updates);
      } else {
        setMessage(json.error || 'Unable to load admin users.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setMessage(json.error || 'Failed to create staff account.');
        return;
      }

      setMessage('Staff account created. Reset code sent to email.');
      setName('');
      setEmail('');
      setRole('ADMIN');
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(userId: string) {
    const updates = userUpdates[userId];
    if (!updates) {
      return;
    }

    setMessage(null);
    setSavingUserId(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage(json.error || 'Unable to save changes.');
        return;
      }
      setMessage('Staff account updated successfully.');
      await fetchUsers();
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Staff & Admin Management</h2>
          <p className="mt-2 text-sm text-stone-600">
            Create admin and staff accounts securely. New users receive an email reset code so they can choose their own password.
          </p>
        </div>

        {message ? <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">{message}</div> : null}

        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleCreate}>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="staff-name">Full name</label>
            <input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="staff-email">Email</label>
            <input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-stone-300 px-3 py-2" />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-stone-700" htmlFor="staff-role">Role</label>
            <select id="staff-role" value={role} onChange={(event) => setRole(event.target.value as RoleOption)} className="w-full rounded-xl border border-stone-300 px-3 py-2">
              {availableRoles.map((option) => (
                <option key={option} value={option}>{option.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-end justify-end">
            <button type="submit" disabled={loading} className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Working…' : 'Create staff account'}
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-lg font-semibold text-stone-900">Active staff accounts</h3>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-stone-50">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-100 text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-stone-500">
                      No staff accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4 font-medium text-stone-900">{user.name}</td>
                      <td className="px-4 py-4 text-stone-600">{user.email}</td>
                      <td className="px-4 py-4 text-stone-600">
                        {user.protected ? (
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">MAIN_ADMIN</span>
                        ) : (
                          <select
                            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                            value={userUpdates[user.id]?.role || user.role}
                            onChange={(event) =>
                              setUserUpdates((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...(prev[user.id] || { accountStatus: user.accountStatus }),
                                  role: event.target.value,
                                },
                              }))
                            }
                          >
                            {availableRoles.map((option) => (
                              <option key={option} value={option}>
                                {option.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4 text-stone-600">
                        <select
                          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                          value={userUpdates[user.id]?.accountStatus || user.accountStatus}
                          disabled={user.protected}
                          onChange={(event) =>
                            setUserUpdates((prev) => ({
                              ...prev,
                              [user.id]: {
                                ...(prev[user.id] || { role: user.role }),
                                accountStatus: event.target.value,
                              },
                            }))
                          }
                        >
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-stone-600">
                        <button
                          type="button"
                          disabled={user.protected || savingUserId === user.id}
                          onClick={() => handleUpdate(user.id)}
                          className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingUserId === user.id ? 'Saving…' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
