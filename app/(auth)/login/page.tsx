import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { LoginForm } from '@/src/components/auth/login-form';
import { env } from '@/src/config/env';
import { ensureMainAdminExists } from '@/src/services/admin-service';

export default async function LoginPage() {
  // Ensure initial main admin exists if env has credentials
  if (env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD && env.INITIAL_ADMIN_NAME) {
    try {
      await ensureMainAdminExists({
        email: env.INITIAL_ADMIN_EMAIL,
        password: env.INITIAL_ADMIN_PASSWORD,
        name: env.INITIAL_ADMIN_NAME,
      });
    } catch (err) {
      // don't fail rendering login page if seeding has an issue
      console.warn('Main admin seeding failed:', err);
    }
  }

  const user = await getSessionUser();

  if (user) {
    // Server-side role-based redirect to prevent client-side role decisions
    const adminRoles = ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];
    if (adminRoles.includes(user.role)) {
      redirect('/admin');
    }

    redirect('/account');
  }

  return <LoginForm />;
}
