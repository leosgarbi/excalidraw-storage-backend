import * as crypto from 'node:crypto';

/** Token de convite seguro (URL-safe, alta entropia). */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** ID numérico (compatível com Excalidraw scenes/rooms). */
export function generateNumericId(length = 16): string {
  let out = '';
  while (out.length < length) {
    out += crypto.randomInt(0, 1_000_000_000).toString().padStart(9, '0');
  }
  return out.slice(0, length);
}
