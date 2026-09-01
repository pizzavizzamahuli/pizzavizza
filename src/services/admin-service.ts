import { findMainAdmin, createUser } from '@/src/services/user-service';

export async function ensureMainAdminExists(input: { email: string; password: string; name: string }) {
  const existing = await findMainAdmin();
  if (existing) {
    return existing;
  }

  const admin = await createUser({
    email: input.email,
    name: input.name,
    password: input.password,
    role: 'MAIN_ADMIN',
    accountStatus: 'ACTIVE',
    protected: true,
  });

  return admin;
}

export async function findMainAdminUser() {
  return findMainAdmin();
}
