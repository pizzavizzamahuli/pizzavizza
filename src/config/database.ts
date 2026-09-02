import { env } from '@/src/config/env';
import { MongoClient } from 'mongodb';
import { Resolver } from 'dns/promises';

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoPromise?: Promise<MongoClient>;
  _mongoMemoryServer?: { stop: () => Promise<unknown> };
};

const uri = env.MONGODB_URI;
const PUBLIC_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

if (!uri) {
  console.warn('MONGODB_URI is not set. Database connection is disabled for this foundation phase.');
}

async function buildDirectMongoUri(uri: string) {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const url = new URL(uri);
  const hostname = url.hostname;
  const database = url.pathname === '/' ? '' : url.pathname;
  const auth = url.username ? `${encodeURIComponent(url.username)}${url.password ? `:${encodeURIComponent(url.password)}` : ''}@` : '';
  const searchParams = new URLSearchParams(url.searchParams);
  if (!searchParams.has('tls') && !searchParams.has('ssl')) {
    searchParams.set('tls', 'true');
  }

  const resolver = new Resolver();
  resolver.setServers(PUBLIC_DNS_SERVERS);

  try {
    const records = await resolver.resolveSrv(`_mongodb._tcp.${hostname}`);
    if (!records.length) {
      throw new Error('No SRV records returned for MongoDB cluster.');
    }

    try {
      const txtRecords = await resolver.resolveTxt(`_mongodb._tcp.${hostname}`);
      if (txtRecords.length > 0 && txtRecords[0].length > 0) {
        const txt = txtRecords[0].join('&');
        const parsed = new URLSearchParams(txt);
        for (const [key, value] of parsed.entries()) {
          if (!searchParams.has(key)) {
            searchParams.set(key, value);
          }
        }
      }
    } catch (txtError) {
      console.warn('MongoDB TXT resolution failed using public DNS servers:', txtError);
    }

    const hosts = records.map((record) => `${record.name}:${record.port}`).join(',');
    const query = searchParams.toString();
    return `mongodb://${auth}${hosts}${database}${query ? `?${query}` : ''}`;
  } catch (error) {
    console.warn('MongoDB SRV resolution failed using public DNS servers:', error);
    return uri;
  }
}

export async function getDatabaseClient() {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  if (globalWithMongo._mongoClient) {
    return globalWithMongo._mongoClient;
  }

  if (!globalWithMongo._mongoPromise) {
    globalWithMongo._mongoPromise = (async () => {
      const resolvedUri = await buildDirectMongoUri(uri);

      try {
        const maxAttempts = 3;
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const client = new MongoClient(resolvedUri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
          });
          try {
            await client.connect();
            return client;
          } catch (error) {
            lastError = error;
            await client.close().catch(() => undefined);
            if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          }
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      } catch (error) {
        const localLikeUri = /localhost|127\.0\.0\.1/.test(resolvedUri);
        if (!localLikeUri) {
          throw error;
        }

        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          const memoryServer = await MongoMemoryServer.create({
            instance: {
              dbName: await getDatabaseName(),
            },
          });

          globalWithMongo._mongoMemoryServer = memoryServer;
          const fallbackUri = memoryServer.getUri();
          const fallbackClient = new MongoClient(fallbackUri);

          // Retry connecting a few times — memory server may take a moment to accept connections
          const maxAttempts = 6;
          const delayMs = 500;
          let lastErr: unknown = null;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              await fallbackClient.connect();
              return fallbackClient;
            } catch (connErr) {
              lastErr = connErr;
              await new Promise((res) => setTimeout(res, delayMs));
            }
          }

          // If we exhausted retries, throw the last connection error
          throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
        } catch {
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
    })().catch((error) => {
      globalWithMongo._mongoPromise = undefined;
      globalWithMongo._mongoClient = undefined;
      throw error;
    });
  }

  globalWithMongo._mongoClient = await globalWithMongo._mongoPromise;
  return globalWithMongo._mongoClient;
}

export async function getDatabaseName() {
  return env.MONGODB_DB_NAME;
}
