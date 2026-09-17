const fs = require('fs');
const path = require('path');
const { Resolver } = require('dns/promises');
const { MongoClient, ObjectId } = require('mongodb');

function loadEnv(filePath) {
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

async function resolveMongoUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri;
  const url = new URL(uri);
  const search = new URLSearchParams(url.searchParams);
  search.set('tls', 'true');
  const resolver = new Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  const records = await resolver.resolveSrv(`_mongodb._tcp.${url.hostname}`);
  const auth = url.username ? `${encodeURIComponent(url.username)}${url.password ? `:${encodeURIComponent(url.password)}` : ''}@` : '';
  const hosts = records.map((record) => `${record.name}:${record.port}`).join(',');
  const database = url.pathname === '/' ? '' : url.pathname;
  return `mongodb://${auth}${hosts}${database}?${search.toString()}`;
}

function objectIds(ids) {
  return ids.flatMap((id) => {
    try { return [new ObjectId(id)]; } catch { return []; }
  });
}

async function removeLocalProofFiles() {
  const directories = ['public/uploads/payment-proofs', 'public/uploads/reservation-payment-proofs'];
  let removed = 0;
  for (const directory of directories) {
    const absolute = path.join(process.cwd(), directory);
    if (!fs.existsSync(absolute)) continue;
    for (const file of fs.readdirSync(absolute)) {
      await fs.promises.unlink(path.join(absolute, file));
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  const client = new MongoClient(await resolveMongoUri(env.MONGODB_URI));
  await client.connect();
  try {
    const db = client.db(env.MONGODB_DB_NAME || 'pizzavizza');
    const usersCollection = db.collection('users');
    const mainAdmins = await usersCollection.find({ role: 'MAIN_ADMIN' }).toArray();
    if (mainAdmins.length !== 1) throw new Error(`Expected exactly one MAIN_ADMIN, found ${mainAdmins.length}. Aborting.`);
    const mainAdmin = mainAdmins[0];
    if (mainAdmin.userCode !== '000024' && mainAdmin.userCode !== '000001') throw new Error(`Protected Main Admin has unexpected user code ${mainAdmin.userCode}. Aborting.`);

    const removableUsers = await usersCollection.find({ _id: { $ne: mainAdmin._id } }).toArray();
    const ids = removableUsers.flatMap((user) => [user._id?.toString(), user.id, user.userCode].filter(Boolean));
    const idsAsObjectIds = objectIds(ids);
    const summary = {};
    const matchAny = (fields) => ({ $or: ids.flatMap((id) => fields.map((field) => ({ [field]: id }))).concat(idsAsObjectIds.flatMap((id) => fields.map((field) => ({ [field]: id })) )) });

    const targets = [
      ['addresses', ['userId']],
      ['carts', ['userId']],
      ['dining_bookings', ['userId']],
      ['notifications', ['recipientId', 'userId']],
      ['orders', ['userId', 'createdByUserId']],
      ['push_subscriptions', ['userId']],
      ['referrals', ['referrerUserId', 'referredUserId']],
      ['telegram_admins', ['userId']],
      ['telegram_audit', ['performedByUserId']],
      ['telegram_link_codes', ['userId']],
      ['wallets', ['userId']],
      ['wallet_ledger', ['userId']],
      ['audit_logs', ['performedBy']],
    ];

    for (const [collectionName, fields] of targets) {
      const result = await db.collection(collectionName).deleteMany(ids.length ? matchAny(fields) : { _id: null });
      summary[collectionName] = result.deletedCount;
    }

    const deletedUsers = await usersCollection.deleteMany({ _id: { $ne: mainAdmin._id } });
    summary.users = deletedUsers.deletedCount;

    const now = new Date();
    await usersCollection.updateOne({ _id: mainAdmin._id }, { $set: { userCode: '000001', updatedAt: now } });
    await db.collection('counters').updateOne({ key: 'user_codes' }, { $set: { seq: 1, updatedAt: now } }, { upsert: true });
    const removedProofFiles = await removeLocalProofFiles();

    const remainingUsers = await usersCollection.find({}).project({ _id: 1, userCode: 1, role: 1, email: 1 }).toArray();
    console.log(JSON.stringify({ preservedMainAdmin: { id: mainAdmin._id.toString(), userCode: '000001', email: mainAdmin.email }, deleted: summary, removedLocalProofFiles: removedProofFiles, remainingUsers }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
