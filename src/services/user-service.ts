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

export function normalizePhoneForFirebaseMatch(phone: string | null | undefined) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
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
    mobileVerified: false,
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

export async function findUserByVerifiedPhoneNumber(phoneNumber: string) {
  const normalizedPhone = normalizePhoneForFirebaseMatch(phoneNumber);
  if (!normalizedPhone) return null;
  const collection = await getUsersCollection();
  const candidates = await collection.find({
    mobile: { $exists: true, $ne: null },
    accountStatus: 'ACTIVE',
  }).project({ passwordHash: 0 }).toArray();
  return candidates.find((user) => normalizePhoneForFirebaseMatch(user.mobile) === normalizedPhone) || null;
}

export async function findUserByPhonePasswordResetToken(token: string) {
  const collection = await getUsersCollection();
  const candidates = await collection.find({
    'passwordReset.method': 'PHONE_FIREBASE',
    'passwordReset.tokenHash': { $exists: true },
    'passwordReset.expiresAt': { $gte: new Date() },
    'passwordReset.attempts': { $lt: 5 },
  }).toArray();

  for (const user of candidates) {
    const tokenHash = user.passwordReset?.tokenHash;
    if (tokenHash && await comparePassword(token, tokenHash)) return user;
  }

  return null;
}

export async function getUserById(id: string) {
  const collection = await getUsersCollection();
  const trimmed = id?.trim();

  if (!trimmed) {
    return null;
  }

  const queries: Array<Record<string, unknown>> = [];

  if (ObjectId.isValid(trimmed)) {
    const objectId = new ObjectId(trimmed);
    queries.push({ _id: objectId });
  }

  queries.push({ userCode: trimmed });
  queries.push({ id: trimmed });

  return collection.findOne({ $or: queries });
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

export async function reserveProfileVerification(id: string, input: {
  codeHash: string;
  expiresAt: Date;
  purpose?: 'PROFILE_UPDATE' | 'MOBILE_VERIFICATION';
  pendingName: string;
  pendingEmail: string;
  pendingMobile: string | null;
}, cooldownMs = 60_000) {
  const collection = await getUsersCollection();
  const cutoff = new Date(Date.now() - cooldownMs);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      $or: [{ 'profileVerification.sentAt': { $exists: false } }, { 'profileVerification.sentAt': { $lte: cutoff } }],
    },
    { $set: { profileVerification: { purpose: 'PROFILE_UPDATE', ...input, attempts: 0, sentAt: new Date() }, updatedAt: new Date() } },
  );
}

export async function incrementProfileVerificationAttempt(id: string) {
  const collection = await getUsersCollection();
  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), 'profileVerification.attempts': { $lt: 5 } },
    { $inc: { 'profileVerification.attempts': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function setPasswordResetForUser(id: string, codeHash: string, expiresAt: Date) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { passwordReset: { method: 'EMAIL_OTP', codeHash, expiresAt, attempts: 0, sentAt: new Date() }, updatedAt: new Date() } }
  );
}

export async function reservePasswordResetEmail(id: string, codeHash: string, expiresAt: Date, cooldownMs = 60_000) {
  const collection = await getUsersCollection();
  const cutoff = new Date(Date.now() - cooldownMs);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      $or: [
        { 'passwordReset.sentAt': { $exists: false } },
        { 'passwordReset.sentAt': { $lte: cutoff } },
        { 'passwordReset.method': { $ne: 'EMAIL_OTP' } },
      ],
    },
    { $set: { passwordReset: { method: 'EMAIL_OTP', codeHash, expiresAt, attempts: 0, sentAt: new Date() }, updatedAt: new Date() } },
  );
}

export async function setPhonePasswordResetForUser(id: string, tokenHash: string, expiresAt: Date, verifiedPhoneNumber: string) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { passwordReset: { method: 'PHONE_FIREBASE', tokenHash, expiresAt, attempts: 0, sentAt: new Date(), verifiedPhoneNumber }, updatedAt: new Date() } },
  );
}

export async function reservePhonePasswordResetForUser(id: string, tokenHash: string, expiresAt: Date, verifiedPhoneNumber: string, cooldownMs = 60_000) {
  const collection = await getUsersCollection();
  const cutoff = new Date(Date.now() - cooldownMs);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      $or: [
        { 'passwordReset.sentAt': { $exists: false } },
        { 'passwordReset.sentAt': { $lte: cutoff } },
        { 'passwordReset.method': { $ne: 'PHONE_FIREBASE' } },
      ],
    },
    { $set: { passwordReset: { method: 'PHONE_FIREBASE', tokenHash, expiresAt, attempts: 0, sentAt: new Date(), verifiedPhoneNumber }, updatedAt: new Date() } },
  );
}

export async function incrementPasswordResetAttempt(id: string) {
  const collection = await getUsersCollection();
  return collection.findOneAndUpdate(
    { _id: new ObjectId(id), $or: [{ 'passwordReset.attempts': { $exists: false } }, { 'passwordReset.attempts': { $lt: 5 } }] },
    { $inc: { 'passwordReset.attempts': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function clearPasswordReset(id: string) {
  const collection = await getUsersCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $unset: { passwordReset: '' }, $set: { updatedAt: new Date() } }
  );
}

export async function consumeEmailPasswordResetCode(id: string, codeHash: string, newPassword: string) {
  const collection = await getUsersCollection();
  const now = new Date();
  const passwordHash = await hashPassword(newPassword);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      'passwordReset.method': 'EMAIL_OTP',
      'passwordReset.codeHash': codeHash,
      'passwordReset.expiresAt': { $gt: now },
      'passwordReset.attempts': { $lte: 5 },
    },
    {
      $set: { passwordHash, lastPasswordChangeAt: now, updatedAt: now },
      $unset: { passwordReset: '' },
    },
  );
}

export async function updateUserPassword(id: string, newPassword: string) {
  const collection = await getUsersCollection();
  const passwordHash = await hashPassword(newPassword);
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { passwordHash, lastPasswordChangeAt: new Date(), updatedAt: new Date() }, $unset: { passwordReset: '' } }
  );
}

export async function consumePhonePasswordResetToken(id: string, tokenHash: string, newPassword: string) {
  const collection = await getUsersCollection();
  const now = new Date();
  const passwordHash = await hashPassword(newPassword);
  return collection.updateOne(
    {
      _id: new ObjectId(id),
      'passwordReset.method': 'PHONE_FIREBASE',
      'passwordReset.tokenHash': tokenHash,
      'passwordReset.expiresAt': { $gt: now },
      'passwordReset.attempts': { $lte: 5 },
    },
    {
      $set: { passwordHash, lastPasswordChangeAt: now, updatedAt: now },
      $unset: { passwordReset: '' },
    },
  );
}

export function isValidMobile(mobile: string) {
  return MOBILE_PATTERN.test(mobile.trim());
}
