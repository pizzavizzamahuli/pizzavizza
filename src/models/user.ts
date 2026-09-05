import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { AccountStatus, TemporaryAccessStatus, UserRole } from '@/src/types';

export interface UserDocument {
  _id?: ObjectId;
  id?: string;
  userCode?: string;
  name: string;
  email: string;
  mobile?: string | null;
  passwordHash: string;
  role: UserRole;
  permissions?: string[];
  staffStatus?: 'AVAILABLE' | 'BUSY' | 'ON_DELIVERY' | 'OFFLINE';
  accountStatus: AccountStatus;
  emailVerified: boolean;
  mobileVerified?: boolean;
  referredByReferralCode?: string | null;
  emailVerification?: {
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    sentAt: Date;
    resendCount?: number;
  } | null;
  profileVerification?: {
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    sentAt: Date;
    purpose?: 'PROFILE_UPDATE' | 'MOBILE_VERIFICATION';
    pendingName: string;
    pendingEmail: string;
    pendingMobile: string | null;
  } | null;
  lastProfileUpdateAt?: Date | null;
  lastPasswordChangeAt?: Date | null;
  temporaryAccess?: {
    enabled: boolean;
    startsAt?: Date | null;
    expiresAt?: Date | null;
    forcePasswordChange?: boolean;
    status?: TemporaryAccessStatus;
  };
  protected?: boolean;
  passwordReset?: {
    codeHash: string;
    expiresAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function findUserByUserCode(userCode: string) {
  const collection = await getUsersCollection();
  return collection.findOne({ userCode: userCode.trim() });
}

const USERS_COLLECTION = 'users';

let usersCollectionPromise: Promise<Collection<UserDocument>> | null = null;

export async function getUsersCollection() {
  if (usersCollectionPromise) {
    return usersCollectionPromise;
  }

  usersCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<UserDocument>(USERS_COLLECTION);
    await collection.createIndex({ userCode: 1 }, { unique: true, sparse: true });
    const indexes: Array<{ spec: Record<string, number>; options?: { unique?: boolean } }> = [
      { spec: { email: 1 }, options: { unique: true } },
      { spec: { mobile: 1 } },
      { spec: { role: 1 } },
      { spec: { accountStatus: 1 } },
    ];

    for (const index of indexes) {
      try {
        await collection.createIndex(index.spec, index.options);
      } catch (err) {
        // Index creation can fail during transient DB startup (in-memory server warmup).
        // Don't let index creation failures block the app — log and continue.
        console.warn('Could not create index on users collection:', err instanceof Error ? err.message : String(err));
      }
    }

    return collection;
  })();

  return usersCollectionPromise;
}
