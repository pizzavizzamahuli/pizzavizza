import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '@/src/config/env';

function parseServiceAccount() {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) {
    const decoded = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
    const account = JSON.parse(decoded) as { project_id?: string; client_email?: string; private_key?: string };
    if (account.project_id && account.client_email && account.private_key) {
      return {
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      };
    }
  }

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

export function isFirebaseAdminConfigured() {
  return Boolean(parseServiceAccount());
}

export function getFirebaseAdminAuth() {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error('Firebase Admin is not configured.');
  }

  const app = getApps()[0] || initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });

  return getAuth(app);
}
