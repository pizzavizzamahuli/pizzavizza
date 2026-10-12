'use client';

import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, RecaptchaVerifier, type Auth } from 'firebase/auth';

let authInstance: Auth | null = null;
let verifier: RecaptchaVerifier | null = null;

export function getFirebaseClientAuth(config: FirebaseOptions) {
  if (authInstance) return authInstance;
  const app = getApps().length ? getApp() : initializeApp(config);
  authInstance = getAuth(app);
  return authInstance;
}

export function getOrCreateRecaptchaVerifier(auth: Auth, containerId: string) {
  if (verifier) return verifier;
  verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return verifier;
}

export async function resetRecaptchaVerifier() {
  const currentVerifier = verifier;
  verifier = null;
  currentVerifier?.clear();
}
