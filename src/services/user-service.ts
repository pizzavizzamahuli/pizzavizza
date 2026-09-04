import { ObjectId } from 'mongodb';
import { getUsersCollection, UserDocument } from '@/src/models/user';
import { AccountStatus, TemporaryAccessStatus, UserRole } from '@/src/types';
import { randomBytes, timingSafeEqual, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { getNextSequence } from '@/src/models/counter';

const scrypt = promisify(_scrypt);
const HASH_KEY_LENGTH = 64;
const HASH_SALT_LENGTH = 16;

const MOBILE_PATTERN = /^[0-9()+\-\s]{8,20}$/;

export async function hashPassword(password: string) {
  const salt = randomBytes(HASH_SALT_LENGTH).toString('hex');
  const derivedKey = (await scrypt(password, salt, HASH_KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function comparePassword(password: string, hash: string) {
  const [salt, derivedKeyHex] = hash.split(':');
  if (!salt || !derivedKeyHex) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, HASH_KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(derivedKeyHex, 'hex');

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeMobile(mobile: string) {
  return mobile.trim();
}

async function createUserCode(collection: Awaited<ReturnType<typeof getUsersCollection>>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = String(await getNextSequence('user_codes')).padStart(6, '0');
    if (!(await collection.findOne({ userCode: next }, { projection: { _id: 1 } }))) return next;
  }
  throw new Error('Unable to generate a unique user ID.');
}

export async function ensureUserCode(user: UserDocument) {
  if (user.userCode) return user.userCode;
  const collection = await getUsersCollection();
  const userCode = await createUserCode(collection);
  await collection.updateOne({ _id: user._id }, { $set: { userCode, updatedAt: new Date() } });
  return userCode;
}

export async function createUser(input: {
  name: string;
  email: string;
  mobile?: string | null;
  password: string;
  role?: UserRole;
  permissions?: string[];
  staffStatus?: 'AVAILABLE' | 'BUSY' | 'ON_DELIVERY' | 'OFFLINE';
  accountStatus?: AccountStatus;
  protected?: boolean;
  temporaryAccess?: {
    enabled: boolean;
    startsAt?: Date | null;
    expiresAt?: Date | null;
    forcePasswordChange?: boolean;
    status?: TemporaryAccessStatus;
  };
  referredByReferralCode?: string | null;
}) {
  const collection = await getUsersCollection();
  const now = new Date();
  const normalizedEmail = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const userCode = await createUserCode(collection);

  const document: UserDocument = {
    name: input.name.trim(),
    email: normalizedEmail,
    userCode,
    mobile: input.mobile?.trim() || null,
    passwordHash,
    role: input.role ?? 'CUSTOMER',
    permissions: input.permissions || [],
    staffStatus: input.staffStatus || (input.role === 'DELIVERY_STAFF' || input.role === 'KITCHEN_STAFF' ? 'AVAILABLE' : undefined),
    accountStatus: input.accountStatus ?? 'ACTIVE',
    emailVerified: false,
    mobileVerified: input.mobile ? false : true,
    referredByReferralCode: input.referredByReferralCode ?? null,
    temporaryAccess: input.temporaryAccess,
    protected: input.protected ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document as UserDocument);
  return { ...document, _id: result.insertedId, id: result.insertedId.toHexString() };
}

export async function findUserByEmail(email: string) {
  const collection = await getUsersCollection();
  const normalizedEmail = normalizeEmail(email);
  return collection.findOne({ email: normalizedEmail });
}

export async function setEmailVerification(id: string, codeHash: string, expiresAt: Date) {
  const collection = await getUsersCollection();
  return collection.updateOne({ _id: new ObjectId(id) }, { $set: { emailVerification: { codeHash, expiresAt, attempts: 0, resendCount: 0, sentAt: new Date() }, updatedAt: new Date() } });
}

export async function setMobileVerification(id: string, codeHash: string, expiresAt: Date) {
  const collection = await getUsersCollection();
  return collection.updateOne({ _id: new ObjectId(id) }, { $set: { mobileVerification: { codeHash, expiresAt, attempts: 0, sentAt: new Date() }, mobileVerified: false, updatedAt: new Date() } });
}

export async function incrementMobileVerificationAttempt(id: string) {
  const collection = await getUsersCollection();
  return collection.findOneAndUpdate({ _id: new ObjectId(id), 'mobileVerification.attempts': { $lt: 5 } }, { $inc: { 'mobileVerification.attempts': 1 }, $set: { updatedAt: new Date() } }, { returnDocument: 'after' });
}

export async function markMobileVerified(id: string) {
  const collection = await getUsersCollection();
  return collection.updateOne({ _id: new ObjectId(id) }, { $set: { mobileVerified: true, updatedAt: new Date() }, $unset: { mobileVerification: '' } });
}

export async function incrementEmailVerificationAttempt(id: string) {
  const collection = await getUsersCollection();
  return collection.findOneAndUpdate({ _id: new ObjectId(id), emailVerified: { $ne: true }, 'emailVerification.attempts': { $lt: 5 } }, { $inc: { 'emailVerification.attempts': 1 }, $set: { updatedAt: new Date() } }, { returnDocument: 'after' });
}

export async function reserveEmailVerificationResend(id: string, codeHash: string, expiresAt: Date, cooldownMs = 60_000) {
  const collection = await getUsersCollection();
  const cutoff = new Date(Date.now() - cooldownMs);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      emailVerified: { $ne: true },
      $or: [{ 'emailVerification.sentAt': { $exists: false } }, { 'emailVerification.sentAt': { $lte: cutoff } }],
    },
    {
      $set: { emailVerification: { codeHash, expiresAt, attempts: 0, sentAt: new Date() }, updatedAt: new Date() },
    },
  );
}

export async function markEmailVerified(id: string) {
  const collection = await getUsersCollection();
  return collection.updateOne({ _id: new ObjectId(id) }, { $set: { emailVerified: true, updatedAt: new Date() }, $unset: { emailVerification: '' } });
}

export async function findUserByLoginIdentifier(identifier: string) {
  const collection = await getUsersCollection();
  const value = identifier.trim();

  if (value.includes('@')) {
    return findUserByEmail(value);
  }

  const compactMobile = value.replace(/\s+/g, '');
  return collection.findOne({
    $or: [
      { mobile: value },
      { mobile: compactMobile },
    ],
  });
}

export async function getUserById(id: string) {
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function countUsers() {
  const collection = await getUsersCollection();
  return collection.countDocuments();
}

export async function findMainAdmin() {
  const collection = await getUsersCollection();
  return collection.findOne({ role: 'MAIN_ADMIN' });
}

export function isUserEligibleForSession(user: UserDocument) {
  if (user.accountStatus !== 'ACTIVE') {
    return false;
  }
  if (user.mobile && user.mobileVerified === false) return false;

  if (user.temporaryAccess?.enabled) {
    const now = new Date();

    if (
      user.temporaryAccess.status === 'DISABLED' ||
      user.temporaryAccess.status === 'EXPIRED' ||
      user.temporaryAccess.status === 'REVOKED'
    ) {
      return false;
    }

    if (user.temporaryAccess.startsAt && now < user.temporaryAccess.startsAt) {
      return false;
    }

    if (user.temporaryAccess.expiresAt && now > user.temporaryAccess.expiresAt) {
      return false;
    }
  }

  return true;
}

export async function updateUser(id: string, updates: Partial<UserDocument>) {
  const collection = await getUsersCollection();
  return collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: new Date() } });
}

export async function setPasswordResetForUser(id: string, codeHash: string, expiresAt: Date) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { passwordReset: { codeHash, expiresAt }, updatedAt: new Date() } }
  );
}

export async function clearPasswordReset(id: string) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $unset: { passwordReset: '' }, $set: { updatedAt: new Date() } }
  );
}

export async function updateUserPassword(id: string, newPassword: string) {
  const collection = await getUsersCollection();
  const passwordHash = await hashPassword(newPassword);
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { passwordHash, updatedAt: new Date() }, $unset: { passwordReset: '' } }
  );
}

export function isValidMobile(mobile: string) {
  return MOBILE_PATTERN.test(mobile.trim());
}
