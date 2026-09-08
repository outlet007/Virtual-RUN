import { decryptSettingSecret, encryptSettingSecret } from "./settings-encryption.ts";
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

export function encryptSmtpPassword(password: string, secret: string) {
  return encryptSettingSecret(password, secret);
}

export function decryptSmtpPassword(payload: string, secret: string) {
  return decryptSettingSecret(payload, secret);
}
