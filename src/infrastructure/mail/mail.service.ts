// infrastructure/mail/mail.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailtrapTransport } from 'mailtrap';
import * as Nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Nodemailer.Transporter;
  private readonly sender: { address: string; name: string };
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.sender = this.configService.get('mail.from')!;
    this.appUrl = this.configService.get<string>('mail.appUrl')!;

    this.transporter = Nodemailer.createTransport(
      MailtrapTransport({
        token: this.configService.get<string>('mail.token')!,
      }),
    );
  }

  // ─── Private Helper ────────────────────────────────────────────
  private async sendMail(
    to: string,
    subject: string,
    html: string,
    category: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.sender,
        to: [to],
        subject,
        html,
        category,
      } as any);
      this.logger.log(`Email sent to ${to} — subject: "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  // ─── Password Reset ────────────────────────────────────────────
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const url = `${this.appUrl}/auth/reset-password?token=${token}`;
    await this.sendMail(
      email,
      'Reset your password',
      this.passwordResetTemplate(url),
      'Password Reset', // 👈
    );
  }

  // ─── Email Verification ────────────────────────────────────────
  async sendEmailVerification(email: string, token: string): Promise<void> {
    const url = `${this.appUrl}/auth/verify-email?token=${token}`;
    await this.sendMail(
      email,
      'Verify your email',
      this.emailVerificationTemplate(url),
      'Email Verification', // 👈
    );
  }

  // ─── Templates ─────────────────────────────────────────────────
  private passwordResetTemplate(url: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Click the button below.</p>
        <a href="${url}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
        ">Reset Password</a>
        <p style="color: #666; margin-top: 16px;">
          This link expires in <strong>15 minutes</strong>.
        </p>
        <p style="color: #666;">
          If you did not request this, ignore this email.
        </p>
      </div>
    `;
  }

  private emailVerificationTemplate(url: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Thanks for signing up! Please verify your email address.</p>
        <a href="${url}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
        ">Verify Email</a>
        <p style="color: #666; margin-top: 16px;">
          This link expires in <strong>24 hours</strong>.
        </p>
      </div>
    `;
  }
}
