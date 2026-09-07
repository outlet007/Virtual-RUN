import "server-only";

import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { getActiveSmtpConfiguration } from "@/lib/smtp-settings";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let transporterKey = "";

async function getTransporter() {
  const configuration = await getActiveSmtpConfiguration();
  if (!configuration.host || !configuration.from) {
    throw new Error("SMTP is not configured");
  }

  const nextKey = createHash("sha256")
    .update(JSON.stringify(configuration))
    .digest("hex");
  if (!transporter || transporterKey !== nextKey) {
    transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth: configuration.username
        ? { user: configuration.username, pass: configuration.password }
        : undefined,
    });
    transporterKey = nextKey;
  }
  return { transporter, from: configuration.from };
}

export async function sendEmail(to: string, subject: string, html: string) {
  const active = await getTransporter();
  await active.transporter.sendMail({
    from: active.from,
    to,
    subject,
    html,
  });
}
