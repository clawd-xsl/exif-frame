type JWTPayload = Record<string, unknown> & { iat?: number; exp?: number; sub?: string | number };

function base64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  }
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str);
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJWT(payload: JWTPayload, secret: string, expiresInSec = 60 * 60 * 24 * 7): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body: JWTPayload = { ...payload, iat: now, exp: now + expiresInSec };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSig = base64urlEncode(signature);
  return `${data}.${encodedSig}`;
}

export async function verifyJWT<T extends JWTPayload = JWTPayload>(token: string, secret: string): Promise<T> {
  const [encodedHeader, encodedPayload, encodedSig] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSig) throw new Error('Invalid token');
  const headerJson = new TextDecoder().decode(base64urlDecode(encodedHeader));
  const header = JSON.parse(headerJson);
  if (header.alg !== 'HS256') throw new Error('Unsupported alg');
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await importHmacKey(secret);
  const sigBytes = base64urlDecode(encodedSig);
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!ok) throw new Error('Invalid signature');
  const payloadJson = new TextDecoder().decode(base64urlDecode(encodedPayload));
  const payload = JSON.parse(payloadJson) as T;
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired');
  return payload;
}

