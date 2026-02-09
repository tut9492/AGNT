import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe admin key verification.
 * Prevents timing attacks that could leak the key length or content.
 */
export function verifyAdminKey(provided: string | null): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
