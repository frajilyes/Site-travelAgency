import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text fallback, shown by clients that refuse HTML. */
  text: string;
  html: string;
}

export type MailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: 'not-configured' | 'error'; detail?: string };

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * SMTP settings read from the environment. Defaults target Gmail, so a Gmail
 * address plus an app password (SMTP_USER / SMTP_PASS) is enough to send.
 * Returns null when no credentials are set — mail is then skipped, never fatal.
 */
function smtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : // 465 is implicit TLS; 587 starts in the clear and upgrades with STARTTLS.
      port === 465;

  return {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port,
    secure,
    user,
    pass,
    from: process.env.MAIL_FROM?.trim() || `SkyRoute <${user}>`,
  };
}

declare global {
  var __travelMailer: Transporter | undefined;
}

// One pooled connection, reused across hot reloads in development.
function transport(config: SmtpConfig): Transporter {
  const existing = globalThis.__travelMailer;
  if (existing) return existing;

  const created = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  globalThis.__travelMailer = created;
  return created;
}

/** Public base URL used for links inside emails. */
export function appUrl(): string {
  return (process.env.APP_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
}

export function mailerConfigured(): boolean {
  return smtpConfig() !== null;
}

/**
 * Deliver one message. Failures are logged and reported, never thrown: an
 * unreachable mail server must not undo a booking that is already paid.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = smtpConfig();

  if (!config) {
    console.warn(
      `[mail] SMTP non configuré — « ${message.subject} » n'a pas été envoyé à ${message.to}. ` +
        'Renseignez SMTP_USER et SMTP_PASS (voir .env.example).',
    );
    return { sent: false, reason: 'not-configured' };
  }

  try {
    const info = await transport(config).sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    console.log(`[mail] « ${message.subject} » envoyé à ${message.to} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[mail] échec de l'envoi à ${message.to} : ${detail}`);
    return { sent: false, reason: 'error', detail };
  }
}
