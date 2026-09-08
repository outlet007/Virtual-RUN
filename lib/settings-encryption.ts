import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const CIPHER_VERSION = "v1";

function deriveKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("Backend settings encryption key must contain at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSettingSecret(value: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSettingSecret(payload: string, secret: string) {
  const [version, ivValue, tagValue, ciphertextValue, extra] = payload.split(":");
  if (version !== CIPHER_VERSION || !ivValue || !tagValue || !ciphertextValue || extra) {
    throw new Error("Invalid backend setting ciphertext");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivValue, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
