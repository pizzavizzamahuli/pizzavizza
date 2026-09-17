const fs = require('fs');
const path = require('path');
const { Resolver } = require('dns/promises');
const { MongoClient } = require('mongodb');

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

async function main() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  const client = new MongoClient(await resolveMongoUri(env.MONGODB_URI));
  await client.connect();
  try {
    const db = client.db(env.MONGODB_DB_NAME || 'pizzavizza');
    const users = await db.collection('users').find({}).project({ name: 1, email: 1, role: 1, userCode: 1, _id: 1 }).toArray();
    const mainAdmins = users.filter((user) => user.role === 'MAIN_ADMIN');
    const removable = users.filter((user) => user.role !== 'MAIN_ADMIN');
    const ids = removable.flatMap((user) => [user._id?.toString(), user.id, user.userCode].filter(Boolean));
    const collectionNames = ['addresses', 'carts', 'dining_bookings', 'notifications', 'orders', 'push_subscriptions', 'referrals', 'telegram_admins', 'telegram_audit', 'telegram_link_codes', 'wallets', 'wallet_ledger'];
    const linked = {};
    for (const name of collectionNames) {
      const or = ids.flatMap((id) => [
        { userId: id },
        { recipientId: id },
        { referrerUserId: id },
        { referredUserId: id },
        { performedByUserId: id },
        { createdByUserId: id },
      ]);
      linked[name] = or.length ? await db.collection(name).countDocuments({ $or: or }) : 0;
    }
    const uploadDirs = ['public/uploads/payment-proofs', 'public/uploads/reservation-payment-proofs'];
    const files = Object.fromEntries(uploadDirs.map((directory) => [directory, fs.existsSync(directory) ? fs.readdirSync(directory).length : 0]));
    const counter = await db.collection('counters').findOne({ key: 'user_codes' });
    console.log(JSON.stringify({ database: db.databaseName, users: { total: users.length, mainAdmins: mainAdmins.map(({ _id, userCode, name, email }) => ({ id: _id?.toString(), userCode, name, email })), removable: removable.map(({ _id, userCode, role, name, email }) => ({ id: _id?.toString(), userCode, role, name, email })) }, linked, files, userCodeCounter: counter?.seq ?? null }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
