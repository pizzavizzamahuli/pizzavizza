import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { notifyUser } from '@/src/services/notification-service';

export type WalletLedgerEntryType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'REFERRAL_REWARD';

export interface WalletLedgerEntry {
  _id?: ObjectId;
  userId: ObjectId | string;
  amount: number;
  type: WalletLedgerEntryType;
  reason: string;
  referenceId?: string | null;
  balanceAfter: number;
  createdAt: Date;
}

export interface WalletDocument {
  _id?: ObjectId;
  userId: ObjectId | string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const WALLETS_COLLECTION = 'wallets';
const WALLET_LEDGER_COLLECTION = 'walletLedger';

let walletsCollectionPromise: Promise<Collection<WalletDocument>> | null = null;
let walletLedgerCollectionPromise: Promise<Collection<WalletLedgerEntry>> | null = null;

export async function getWalletsCollection() {
  if (walletsCollectionPromise) return walletsCollectionPromise;

  walletsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<WalletDocument>(WALLETS_COLLECTION);
    await collection.createIndex({ userId: 1 }, { unique: true });
    return collection;
  })();

  return walletsCollectionPromise;
}

export async function getWalletLedgerCollection() {
  if (walletLedgerCollectionPromise) return walletLedgerCollectionPromise;

  walletLedgerCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<WalletLedgerEntry>(WALLET_LEDGER_COLLECTION);
    await collection.createIndex({ userId: 1, createdAt: -1 });
    // Prevent duplicate ledger entries for the same user + referenceId.
    // Use a partial unique index so documents without a referenceId (null/absent)
    // are not constrained by uniqueness.
    try {
      await collection.createIndex(
        { userId: 1, referenceId: 1 },
        { unique: true, partialFilterExpression: { referenceId: { $exists: true, $ne: null } } },
      );
    } catch (e) {
      // Index creation may fail in certain environments (existing conflicting docs);
      // fail-safe: log and continue — runtime dedupe still protects against duplicates.
      console.warn('Could not create wallet ledger unique index', e);
    }
    return collection;
  })();

  return walletLedgerCollectionPromise;
}

export async function getOrCreateWallet(userId: string, session?: ClientSession) {
  const col = await getWalletsCollection();
  const existingWallet = await col.findOne({ userId }, { session });
  if (existingWallet) {
    return existingWallet;
  }

  const now = new Date();
  const wallet: WalletDocument = { userId, balance: 0, currency: 'INR', createdAt: now, updatedAt: now };
  await col.insertOne(wallet as WalletDocument, { session });
  return wallet;
}

export async function adjustWalletBalance(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string | null,
  entryType?: WalletLedgerEntryType,
  session?: ClientSession,
) {
  const col = await getWalletsCollection();
  const ledgerCol = await getWalletLedgerCollection();
  const wallet = await getOrCreateWallet(userId, session);

  if (referenceId) {
    const existingEntry = await ledgerCol.findOne({ userId, referenceId }, { session });
    if (existingEntry) {
      return { balance: wallet.balance };
    }
  }

  const updatedWallet = await col.findOneAndUpdate(
    amount < 0 ? { userId, balance: { $gte: Math.abs(amount) } } : { userId },
    { $inc: { balance: amount }, $set: { updatedAt: new Date() } },
    { session, returnDocument: 'after' },
  );
  if (!updatedWallet) throw new Error('Insufficient wallet balance');

  try {
    await ledgerCol.insertOne({
    userId,
    amount,
    type: entryType || (amount >= 0 ? 'CREDIT' : 'DEBIT'),
    reason,
    referenceId: referenceId || null,
    balanceAfter: Number(updatedWallet.balance || 0),
    createdAt: new Date(),
    } as WalletLedgerEntry, { session });
  } catch (error: unknown) {
    if (referenceId && /duplicate|E11000/i.test(error instanceof Error ? error.message : String(error))) {
      if (!session) {
        const reverted = await col.findOneAndUpdate(
          { userId, balance: Number(updatedWallet.balance || 0) },
          { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
          { returnDocument: 'after' },
        );
        return { balance: Number(reverted?.balance ?? updatedWallet.balance ?? 0) };
      }
      throw error;
    }
    throw error;
  }

  notifyUser(userId, { type: amount >= 0 ? 'WALLET_CREDIT' : 'WALLET_DEBIT', title: amount >= 0 ? 'Wallet credited' : 'Wallet debited', message: `${amount >= 0 ? 'INR ' + amount + ' was added to' : 'INR ' + Math.abs(amount) + ' was used from'} your wallet.`, href: '/account/wallet', relatedType: 'wallet', relatedId: referenceId || null, eventKey: `wallet:${userId}:${referenceId || `${Date.now()}:${amount}`}` }).catch((error) => console.error('Wallet notification failed', error));
  return { balance: Number(updatedWallet.balance || 0) };
}

export async function getWalletBalance(userId: string, session?: ClientSession) {
  const wallet = await getOrCreateWallet(userId, session);
  return Number(wallet.balance || 0);
}

export async function listWallets() {
  const col = await getWalletsCollection();
  return col.find({}).sort({ balance: -1 }).toArray();
}

export async function getWalletLedger(userId: string) {
  const col = await getWalletLedgerCollection();
  return col.find({ userId }).sort({ createdAt: -1 }).toArray();
}
