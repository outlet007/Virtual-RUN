import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const CIPHER_VERSION = "v1";
const SMTP_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SmtpInput = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
};

export function isValidSmtpEmail(value: string) {
  return value.length > 0 && value.length <= 254 && SMTP_EMAIL_PATTERN.test(value);
}

export function validateSmtpInput(input: SmtpInput) {
  if (!input.host || input.host.length > 255) return "Enter a valid SMTP host.";
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) {
    return "SMTP port must be an integer from 1 to 65,535.";
  }
  if (input.username.length > 320) return "SMTP username is too long.";
  if (!input.fromName || input.fromName.length > 255) return "Enter a valid sender name.";
  if (!isValidSmtpEmail(input.fromEmail)) return "Enter a valid sender email.";
  return null;
}

function deriveKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("SMTP_SETTINGS_ENCRYPTION_KEY must contain at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSmtpPassword(password: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [CIPHER_VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSmtpPassword(payload: string, secret: string) {
  const [version, ivValue, tagValue, ciphertextValue, extra] = payload.split(":");
  if (version !== CIPHER_VERSION || !ivValue || !tagValue || !ciphertextValue || extra) {
    throw new Error("Invalid SMTP password ciphertext");
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
