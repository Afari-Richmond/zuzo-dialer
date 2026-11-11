import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Thin Resend wrapper with a dev fallback: without RESEND_API_KEY configured
 * (true for this sandbox — no real provider key set up yet), emails are
 * logged to the console instead of sent, so the invite/reset flows are fully
 * testable without an external account.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get<string>('EMAIL_FROM') || 'zuzo-dialer <no-reply@zuzo-dialer.local>';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[DEV EMAIL — no RESEND_API_KEY] to=${to} subject="${subject}"\n${html}`);
      return;
    }
    const result = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
  }

  async sendInvite(to: string, tenantName: string, acceptUrl: string): Promise<void> {
    await this.send(
      to,
      `You've been invited to ${tenantName} on zuzo-dialer`,
      `<p>You've been invited to join <strong>${tenantName}</strong> on zuzo-dialer.</p>` +
        `<p><a href="${acceptUrl}">Accept the invite and set your password</a></p>` +
        `<p>This link expires in 7 days.</p>`,
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      'Reset your zuzo-dialer password',
      `<p>Click the link below to reset your password. If you didn't request this, you can ignore this email.</p>` +
        `<p><a href="${resetUrl}">Reset your password</a></p>` +
        `<p>This link expires in 1 hour.</p>`,
    );
  }
}
