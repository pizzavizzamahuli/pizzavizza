import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
  // Public admin login removed in Phase 3 — redirect to unified /login
  redirect('/login');
}
