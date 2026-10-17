import { createVerify } from 'node:crypto';

// AdMob server-side verification (SSV) for rewarded ads. After a rewarded ad is
// watched, Google calls our GET /ads/ssv with the ad's details signed by an
// ECDSA key (SHA-256). Verifying that signature is what proves the view really
// happened -- see https://developers.google.com/admob/android/ssv
const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const KEY_CACHE_MS = 24 * 60 * 60 * 1000;

let keyCache: { fetchedAt: number; pemByKeyId: Map<string, string> } | null = null;

async function fetchKeys(): Promise<Map<string, string>> {
  if (keyCache && Date.now() - keyCache.fetchedAt < KEY_CACHE_MS) return keyCache.pemByKeyId;
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`verifier-keys fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys: Array<{ keyId: number | string; pem: string }> };
  const pemByKeyId = new Map(body.keys.map((k) => [String(k.keyId), k.pem]));
  keyCache = { fetchedAt: Date.now(), pemByKeyId };
  return pemByKeyId;
}

export type PemLookup = (keyId: string) => Promise<string | undefined>;

const defaultLookup: PemLookup = async (keyId) => {
  const keys = await fetchKeys();
  if (keys.has(keyId)) return keys.get(keyId);
  // A key rotated in since the cache was filled -- refresh once.
  keyCache = null;
  return (await fetchKeys()).get(keyId);
};

export interface VerifiedSsv {
  userId: string;
  transactionId: string;
  customData: string | null;
}

// `rawQuery` is the request's query string EXACTLY as received (no decoding or
// re-ordering): the signed message is everything before "&signature=", byte for
// byte. Google appends `signature` then `key_id` as the last two parameters.
export async function verifyAdMobSsv(rawQuery: string, lookupPem: PemLookup = defaultLookup): Promise<VerifiedSsv | null> {
  const sigIndex = rawQuery.indexOf('&signature=');
  if (sigIndex < 0) return null;
  const message = rawQuery.slice(0, sigIndex);
  const params = new URLSearchParams(rawQuery);
  const signature = params.get('signature');
  const keyId = params.get('key_id');
  const userId = params.get('user_id');
  const transactionId = params.get('transaction_id');
  if (!signature || !keyId || !userId || !transactionId) return null;

  const pem = await lookupPem(keyId);
  if (!pem) return null;

  // Signature is base64url (RFC 4648 section 5) of a DER-encoded ECDSA signature.
  const der = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const verifier = createVerify('SHA256');
  verifier.update(message);
  if (!verifier.verify(pem, der)) return null;

  return { userId, transactionId, customData: params.get('custom_data') };
}
