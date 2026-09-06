import { requireMainAdmin } from '@/src/auth/guard';

export default async function TelegramSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireMainAdmin();
  return children;
}