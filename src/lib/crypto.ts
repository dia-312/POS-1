const ITERATIONS = 100_000;
const HASH_PREFIX = "pbkdf2";

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveHash(
  secret: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );

  return bufferToHex(new Uint8Array(bits));
}

/* Format: pbkdf2:<iterations>:<saltHex>:<hashHex> */
export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(secret, salt, ITERATIONS);

  return `${HASH_PREFIX}:${ITERATIONS}:${bufferToHex(salt)}:${hash}`;
}

export function isHashed(value: string | null | undefined): boolean {
  return !!value && value.startsWith(`${HASH_PREFIX}:`);
}

export async function verifySecret(
  secret: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!isHashed(stored)) return false;

  const [, iterationsStr, saltHex, hashHex] = stored!.split(":");
  const iterations = Number(iterationsStr);
  const salt = hexToBuffer(saltHex);

  const candidateHash = await deriveHash(secret, salt, iterations);

  return candidateHash === hashHex;
}
