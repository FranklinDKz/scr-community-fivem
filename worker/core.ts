import { z } from "zod";
export const dayInBrazil = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const resourceSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(20).max(12000),
    category: z.enum(["script", "map"]),
    framework: z.string().trim().min(2).max(80),
    version: z.string().trim().min(1).max(30),
    exclusive: z.boolean(),
    published: z.boolean(),
    reviewed: z.boolean(),
    author: z.string().trim().min(2).max(100),
    license: z.string().trim().min(3).max(500),
    media: z
      .array(
        z.object({
          type: z.enum(["image", "video"]),
          url: z
            .string()
            .max(2048)
            .refine(
              (value) =>
                /^\/api\/media\/[a-zA-Z0-9./_-]+$/.test(value) ||
                /^https:\/\//.test(value),
              "Use uma URL HTTPS ou mídia enviada.",
            ),
          caption: z.string().max(500),
        }),
      )
      .max(12),
    fileKey: z
      .string()
      .regex(/^resources\/[a-zA-Z0-9._/-]+$/)
      .nullable(),
    filename: z.string().min(1).max(200).nullable(),
  })
  .refine(
    (r) => !r.published || (r.reviewed && !!r.fileKey && !!r.filename),
    "Para publicar, anexe o ZIP e confirme a revisão e a autorização de distribuição.",
  );
export async function sha256(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const randomSalt = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
};

export async function hashPassword(
  password: string,
  salt: string,
  pepper: string,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${password}\u0000${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      // Cloudflare Workers currently supports up to 100,000 iterations.
      iterations: 100_000,
    },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  pepper: string,
) {
  const candidate = base64ToBytes(await hashPassword(password, salt, pepper));
  const expected = base64ToBytes(expectedHash);
  if (candidate.byteLength !== expected.byteLength) return false;
  const proof = new TextEncoder().encode("scr-password-verification-v1");
  const candidateKey = await crypto.subtle.importKey(
    "raw",
    candidate,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedKey = await crypto.subtle.importKey(
    "raw",
    expected,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", candidateKey, proof);
  return crypto.subtle.verify("HMAC", expectedKey, signature, proof);
}
export async function validSignature(
  secret: string,
  id: string,
  requestId: string,
  signature: string,
) {
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=")),
  );
  if (
    !parts.ts ||
    !/^[a-fA-F0-9]{64}$/.test(parts.v1 || "") ||
    !/^\d+$/.test(parts.ts)
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(parts.v1.match(/../g)!, (p) =>
    parseInt(String(p), 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(
      `id:${id};request-id:${requestId};ts:${parts.ts};`,
    ),
  );
}
export function resourceFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    framework: r.framework,
    version: r.version,
    exclusive: !!r.exclusive,
    published: !!r.published,
    reviewed: !!r.reviewed,
    author: r.author,
    license: r.license,
    media: JSON.parse(String(r.media)),
    fileKey: null,
    filename: r.filename,
    downloads: r.downloads,
    createdAt: r.created_at,
  };
}
export function isActiveOrder(
  order: { status: string; valid_until: string | null },
  now = new Date(),
) {
  return (
    order.status === "approved" &&
    (!order.valid_until || Date.parse(order.valid_until) > now.getTime())
  );
}
