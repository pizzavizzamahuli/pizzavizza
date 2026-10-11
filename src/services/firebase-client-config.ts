import { env } from '@/src/config/env';

export function getFirebasePublicConfig() {
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || '',
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  };

  const enabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  return { enabled, config };
}
