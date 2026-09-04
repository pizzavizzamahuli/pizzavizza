import Link from 'next/link';
import { NotificationBell } from '@/src/components/notifications/notification-bell';
import { LogoutButton } from '@/src/components/auth/logout-button';

export default function StaffShell({ children, name, role }: { children: React.ReactNode; name: string; role: string }) {
  return <div className="min-h-screen bg-stone-50 text-stone-900"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6"><Link href="/" className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Pizza Vizza</p><p className="truncate text-sm font-semibold sm:text-base">{role.replaceAll('_', ' ')} workspace</p></Link><div className="flex shrink-0 items-center gap-2"><span className="hidden text-sm text-stone-600 sm:inline">{name}</span><NotificationBell /><LogoutButton /></div></div></header><main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">{children}</main></div>;
}
