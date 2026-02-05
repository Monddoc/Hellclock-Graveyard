/**
 * Utility: Client-side hash generation.
 * Generates a SHA-256 hash to uniquely identify a death submission (User ID + Raw JSON).
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
