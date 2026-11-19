import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Hash de parolă cu scrypt: „scrypt$<salt>$<hash>” (base64url). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | undefined) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, saltB64, hashB64] = stored.split("$");
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
