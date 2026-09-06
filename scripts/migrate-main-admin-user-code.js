const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnv(filePath) {
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

async function main() {
  const env = loadEnv(path.join(process.cwd(), '.env.local'));
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();

  try {
    const collection = client.db(env.MONGODB_DB_NAME || 'pizzavizza').collection('users');
    const mainAdmin = await collection.findOne({ role: 'MAIN_ADMIN' });
    if (!mainAdmin) throw new Error('No MAIN_ADMIN account found.');

    const reservedCode = '000001';
    const currentOwner = await collection.findOne({ userCode: reservedCode });
    if (currentOwner && String(currentOwner._id) !== String(mainAdmin._id)) {
      const users = await collection.find({ userCode: { $regex: /^\d{6}$/ } }).project({ userCode: 1 }).toArray();
      const highest = users.reduce((max, user) => Math.max(max, Number(user.userCode)), 0);
      let replacementCode = String(highest + 1).padStart(6, '0');
      while (await collection.findOne({ userCode: replacementCode })) {
        replacementCode = String(Number(replacementCode) + 1).padStart(6, '0');
      }

      await collection.updateOne({ _id: currentOwner._id }, { $set: { userCode: replacementCode, updatedAt: new Date() } });
      await client.db(env.MONGODB_DB_NAME || 'pizzavizza').collection('counters').updateOne(
        { key: 'user_codes' },
        { $max: { seq: Number(replacementCode) } },
        { upsert: true },
      );
      console.log(`Reassigned existing ${reservedCode} user to ${replacementCode}.`);
    }

    await collection.updateOne({ _id: mainAdmin._id }, { $set: { userCode: reservedCode, updatedAt: new Date() } });
    console.log(`MAIN_ADMIN ${mainAdmin.email} now has User ID ${reservedCode}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});