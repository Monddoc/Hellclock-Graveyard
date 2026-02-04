/**
 * Generate a unique hash for a death submission (client-side).
 * Used for unique_hash column to prevent duplicate submissions.
 */
export async function generateUniqueHash(payload: {
  userId: string;
  rawSnapshot: string;
}): Promise<string> {
  const str = `${payload.userId}|${payload.rawSnapshot}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
