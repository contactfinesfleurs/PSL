import * as crypto from "crypto";
import * as OTPAuth from "otpauth";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string with AES-256-GCM. Returns base64 `iv:ciphertext:tag`. */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

/** Decrypt a string produced by encryptSecret(). Throws on malformed input. */
export function decryptSecret(encoded: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted secret: expected iv:ciphertext:tag format");
  }
  const [ivB64, ciphertextB64, tagB64] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Malformed encrypted secret: invalid IV or tag length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Generate a new TOTP secret and otpauth:// URI for QR code. */
export function generateTotpSecret(email: string): {
  base32Secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer: "PSL Studio",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    base32Secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/** Verify a 6-digit TOTP code against an encrypted secret. Window=1 allows ±30s drift. */
export function verifyTotpCode(
  encryptedSecret: string,
  code: string
): boolean {
  let base32: string;
  try {
    base32 = decryptSecret(encryptedSecret);
  } catch (err) {
    console.error("[TOTP] Failed to decrypt secret:", err instanceof Error ? err.message : err);
    return false;
  }

  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(base32),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  // validate() returns the delta (0 = exact, 1/-1 = ±1 period) or null if invalid
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
