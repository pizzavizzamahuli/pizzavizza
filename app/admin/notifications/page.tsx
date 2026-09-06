import { NotificationHistory } from '@/src/components/notifications/notification-history';
import { requireAdminPanelAccess } from '@/src/auth/guard';

export default async function AdminNotificationsPage() {
  await requireAdminPanelAccess();
  return <NotificationHistory />;
}
