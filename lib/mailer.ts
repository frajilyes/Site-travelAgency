import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { appOrigin, env, isProduction } from './env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: 'not-configured' | 'invalid-recipient' | 'error'; detail?: string };

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function smtpConfig(): SmtpConfig | null {
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!user || !pass) return null;

  const port = env.SMTP_PORT;
  const secure =
    env.SMTP_SECURE ??
    port === 465;

  return {
    host: env.SMTP_HOST ?? 'smtp.gmail.com',
    port,
    secure,
    user,
    pass,
    from: env.MAIL_FROM ?? `SkyRoute <${user}>`,
  };
}

declare global {
  var __travelMailer: Transporter | undefined;
}

function transport(config: SmtpConfig): Transporter {
  const existing = globalThis.__travelMailer;
  if (existing) return existing;

  const created = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    requireTLS: true,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: config.host,
    },
  });
  globalThis.__travelMailer = created;
  return created;
}

export function appUrl(): string {
  return appOrigin();
}

export function mailerConfigured(): boolean {
  return smtpConfig() !== null;
}

function validRecipient(address: string): boolean {
  return /^[^\s<>,;:"\\]+@[^\s<>,;:"\\]+\.[A-Za-z]{2,}$/.test(address) && address.length <= 254;
}

function forLog(address: string): string {
  if (!isProduction) return address;
  const at = address.lastIndexOf('@');
  return at === -1 ? '***' : `***${address.slice(at)}`;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = smtpConfig();

  if (!config) {
    console.warn(
      `[mail] SMTP not configured — "${message.subject}" was not sent. ` +
        'Set SMTP_USER and SMTP_PASS (see .env.example).',
    );
    return { sent: false, reason: 'not-configured' };
  }

  if (!validRecipient(message.to)) {
    console.error('[mail] recipient refused: invalid address.');
    return { sent: false, reason: 'invalid-recipient' };
  }

  try {
    const info = await transport(config).sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    console.log(`[mail] "${message.subject}" sent to ${forLog(message.to)} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[mail] failed to send to ${forLog(message.to)}: ${detail}`);
    return { sent: false, reason: 'error', detail };
  }
}
