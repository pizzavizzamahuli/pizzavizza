'use client';

import { useEffect, useState } from 'react';

type UserRow = { id: string; userCode?: string; name: string; email: string; mobile?: string | null; role: string; accountStatus: string; protected?: boolean };
const statuses = ['ACTIVE', 'DISABLED', 'SUSPENDED'];
const mainRoles = ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];
const adminRoles = ['KITCHEN_STAFF', 'DELIVERY_STAFF'];

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<string[]>(mainRoles);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [updates, setUpdates] = useState<Record<string, { role: string; accountStatus: string }>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setUpdates(Object.fromEntries(nextUsers.map((item: UserRow) => [item.id, { role: item.role, accountStatus: item.accountStatus }])));
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

  return <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
    <div><h2 className="text-xl font-semibold">{isMainAdmin ? 'User, Admin & Staff Management' : 'Consumer Promotion & Staff Management'}</h2><p className="mt-2 text-sm text-stone-600">Main Admin controls privileged accounts. Normal admins only see consumers and can promote them to kitchen or delivery staff.</p></div>
    {message ? <p className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}
    <form onSubmit={createAccount} className="mt-5 grid gap-3 md:grid-cols-2">
      <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="rounded-xl border px-3 py-2" />
      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border px-3 py-2" />
      <input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Phone number" className="rounded-xl border px-3 py-2" />
      <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password, optional if email reset is preferred" className="rounded-xl border px-3 py-2" />
      <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border px-3 py-2">{roles.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
      <button type="submit" disabled={loading} className="rounded-full bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{loading ? 'Working...' : 'Create account'}</button>
    </form>
    <div className="mt-6 overflow-x-auto rounded-2xl border"><table className="min-w-full text-left text-sm"><thead className="bg-stone-100"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="px-3 py-3 font-medium">{user.name}</td><td className="px-3 py-3">{user.email}<br />{user.mobile || 'No phone'}</td><td className="px-3 py-3">{user.protected ? 'MAIN ADMIN' : <select value={updates[user.id]?.role || user.role} onChange={(event) => setUpdates((current) => ({ ...current, [user.id]: { ...current[user.id], role: event.target.value } }))} className="rounded-lg border px-2 py-1">{(isMainAdmin ? roles : adminRoles).map((item) => <option key={item}>{item}</option>)}</select>}</td><td className="px-3 py-3"><select value={updates[user.id]?.accountStatus || user.accountStatus} disabled={user.protected} onChange={(event) => setUpdates((current) => ({ ...current, [user.id]: { ...current[user.id], accountStatus: event.target.value } }))} className="rounded-lg border px-2 py-1">{statuses.map((item) => <option key={item}>{item}</option>)}</select></td><td className="whitespace-nowrap px-3 py-3"><button type="button" disabled={user.protected} onClick={() => saveUser(user.id)} className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>{!user.protected ? <><button type="button" onClick={() => changePassword(user.id)} className="ml-2 rounded-full border px-3 py-1.5 text-xs font-semibold">Password</button>{isMainAdmin ? <button type="button" onClick={() => changePassword(user.id, true)} className="ml-2 rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700">Temporary</button> : null}</> : null}</td></tr>)}</tbody></table>{!users.length ? <p className="p-5 text-sm text-stone-500">No visible accounts.</p> : null}</div>
  </section>;
}
