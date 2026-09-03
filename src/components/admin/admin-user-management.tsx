'use client';

import { useEffect, useState } from 'react';

type UserRow = { id: string; userCode?: string; name: string; email: string; mobile?: string | null; role: string; accountStatus: string; permissions?: string[]; protected?: boolean };
const statuses = ['ACTIVE', 'DISABLED', 'SUSPENDED'];
const mainRoles = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];
const adminRoles = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF', 'CUSTOMER'];
const permissionOptions = ['orders.view', 'orders.manage', 'kitchen.view', 'kitchen.manage', 'delivery.view', 'delivery.manage', 'bookings.view', 'bookings.manage', 'payments.view', 'payments.manage', 'customers.view', 'customers.manage', 'reports.view'];

function roleLabel(role: string) {
  if (role === 'CUSTOMER') return 'Consumer';
  if (role === 'MAIN_ADMIN') return 'Main Admin';
  return role.replaceAll('_', ' ');
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<string[]>(mainRoles);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [updates, setUpdates] = useState<Record<string, { role: string; accountStatus: string; permissions: string[] }>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [user.userCode || '', user.name, user.email, user.mobile || '', user.role, user.accountStatus].join(' ').toLowerCase().includes(term);
  });

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load users.');
      const nextUsers = json.data || [];
      setUsers(nextUsers);
      setIsMainAdmin(Boolean(json.meta?.isMainAdmin));
      setRoles(json.meta?.availableRoles || mainRoles);
      setRole(json.meta?.availableRoles?.[0] || 'ADMIN');
      setUpdates(Object.fromEntries(nextUsers.map((item: UserRow) => [item.id, { role: item.role, accountStatus: item.accountStatus, permissions: item.permissions || [] }])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers().catch(() => undefined);
  }, []);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, mobile, password, role }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to create account.');
      setMessage(password ? 'Account created with the supplied password.' : 'Account created. Reset code sent by email.');
      setName(''); setEmail(''); setMobile(''); setPassword('');
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(id: string) {
    const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates[id]) });
    const json = await response.json();
    setMessage(response.ok ? 'User updated successfully.' : (json.error || 'Unable to update user.'));
    if (response.ok) await loadUsers();
  }

  async function changePassword(id: string, temporary = false) {
    const value = window.prompt(temporary ? 'Temporary password, minimum 8 characters:' : 'New password, minimum 8 characters:');
    if (!value) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(temporary ? { temporaryPassword: value } : { newPassword: value }) });
    const json = await response.json();
    setMessage(response.ok ? (temporary ? 'Temporary login password created.' : 'Password changed successfully.') : (json.error || 'Unable to change password.'));
  }

  return <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">User, Admin &amp; Staff Management</h2><p className="mt-1 text-xs text-stone-600">View every account role and change non-protected user roles.</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{users.length} users</span></div>
    {message ? <p className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}
    <div className="mt-4"><label htmlFor="admin-user-search" className="sr-only">Search users</label><input id="admin-user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by User ID, name, email, mobile, role" className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm" /></div>
    <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-stone-700">Create admin or staff account</summary>
    <form onSubmit={createAccount} className="grid gap-3 border-t border-stone-200 p-3 md:grid-cols-2">
      <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="rounded-xl border px-3 py-2" />
      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border px-3 py-2" />
      <input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Phone number" className="rounded-xl border px-3 py-2" />
      <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password, optional if email reset is preferred" className="rounded-xl border px-3 py-2" />
      <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border px-3 py-2">{roles.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select>
      <button type="submit" disabled={loading} className="rounded-full bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{loading ? 'Working...' : 'Create account'}</button>
    </form></details>
      <div className="mt-4 overflow-x-auto rounded-xl border"><table className="min-w-full text-left text-sm"><thead className="bg-stone-100"><tr><th className="px-3 py-2">User ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead><tbody className="divide-y">{filteredUsers.map((user) => <tr key={user.id}><td className="px-3 py-2 font-mono text-xs font-semibold">{user.userCode || '—'}</td><td className="px-3 py-2 font-medium">{user.name}</td><td className="px-3 py-2">{user.email}<br />{user.mobile || 'No phone'}</td><td className="px-3 py-2">{user.protected ? <span className="font-semibold text-amber-700">Main Admin</span> : <select value={updates[user.id]?.role || user.role} onChange={(event) => setUpdates((current) => ({ ...current, [user.id]: { ...current[user.id], role: event.target.value } }))} className="rounded-lg border px-2 py-1">{(isMainAdmin ? roles : adminRoles).map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select>}</td><td className="px-3 py-2"><select value={updates[user.id]?.accountStatus || user.accountStatus} disabled={user.protected} onChange={(event) => setUpdates((current) => ({ ...current, [user.id]: { ...current[user.id], accountStatus: event.target.value } }))} className="rounded-lg border px-2 py-1">{statuses.map((item) => <option key={item}>{item}</option>)}</select></td><td className="whitespace-nowrap px-3 py-2"><button type="button" disabled={user.protected} onClick={() => saveUser(user.id)} className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>{!user.protected ? <><button type="button" onClick={() => changePassword(user.id)} className="ml-2 rounded-full border px-3 py-1.5 text-xs font-semibold">Password</button>{isMainAdmin ? <button type="button" onClick={() => changePassword(user.id, true)} className="ml-2 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700">Temporary</button> : null}</> : null}</td></tr>)}</tbody></table>{!filteredUsers.length ? <p className="p-5 text-sm text-stone-500">No matching accounts.</p> : null}</div>
      {isMainAdmin ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-900">Assigned permissions</p><p className="mt-1 text-xs text-amber-800">Select a staff member above, then use the browser request/API to manage granular capabilities.</p>{filteredUsers.filter((user) => !user.protected && user.role !== 'CUSTOMER').map((user) => <label key={`${user.id}-permissions`} className="mt-3 block text-sm text-stone-700"><span className="font-medium">{user.name}</span><select multiple value={updates[user.id]?.permissions || []} onChange={(event) => setUpdates((current) => ({ ...current, [user.id]: { ...current[user.id], permissions: Array.from(event.target.selectedOptions, (option) => option.value) } }))} className="mt-1 h-24 w-full rounded-lg border bg-white px-2 py-1">{permissionOptions.map((permission) => <option key={permission} value={permission}>{permission}</option>)}</select><button type="button" onClick={() => saveUser(user.id)} className="mt-1 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">Save permissions</button></label>)}</div> : null}
  </section>;
}
