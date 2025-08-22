import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger.simple';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    // Validate required environment variables
    if (!config.auth.user || !config.auth.pass) {
      logger.warn('SMTP credentials not configured. Email functionality will be disabled.');
      // Return a test transporter for development
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }

    return nodemailer.createTransport(config);
  }

  async sendPasswordResetEmail(email: string, resetToken: string, firstName?: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const name = firstName || 'Kunde';

    const mailOptions = {
      from: {
        name: 'Helseriet',
        address: process.env.SMTP_USER || 'noreply@helseriet.no'
      },
      to: email,
      subject: 'Tilbakestill passord - Helseriet',
      html: this.getPasswordResetTemplate(name, resetUrl),
      text: this.getPasswordResetTextVersion(name, resetUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`, { messageId: info.messageId });
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Kunne ikke sende e-post. Prøv igjen senere.');
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'Kunde';

    const mailOptions = {
      from: {
        name: 'Helseriet',
        address: process.env.SMTP_USER || 'noreply@helseriet.no'
      },
      to: email,
      subject: 'Velkommen til Helseriet!',
      html: this.getWelcomeTemplate(name),
      text: this.getWelcomeTextVersion(name)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`, { messageId: info.messageId });
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error for welcome emails - they're not critical
    }
  }

  async sendOrderConfirmationEmail(
    email: string, 
    orderNumber: string, 
    totalAmount: number,
    firstName?: string
  ): Promise<void> {
    const name = firstName || 'Kunde';

    const mailOptions = {
      from: {
        name: 'Helseriet',
        address: process.env.SMTP_USER || 'noreply@helseriet.no'
      },
      to: email,
      subject: `Ordrebekreftelse - #${orderNumber}`,
      html: this.getOrderConfirmationTemplate(name, orderNumber, totalAmount),
      text: this.getOrderConfirmationTextVersion(name, orderNumber, totalAmount)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Order confirmation email sent to ${email}`, { messageId: info.messageId, orderNumber });
    } catch (error) {
      logger.error('Failed to send order confirmation email:', error);
      // Don't throw error - order processing should continue
    }
  }

  private getPasswordResetTemplate(name: string, resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tilbakestill passord</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #9CAF88; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .content h2 { color: #333; margin-top: 0; }
            .content p { color: #666; line-height: 1.6; }
            .button { display: inline-block; padding: 15px 30px; background-color: #9CAF88; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; background-color: #f8f8f8; text-align: center; font-size: 14px; color: #888; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Helseriet</h1>
            </div>
            <div class="content">
                <h2>Hei ${name}!</h2>
                <p>Du har bedt om å tilbakestille passordet ditt for Helseriet-kontoen din.</p>
                <p>Klikk på knappen under for å opprette et nytt passord:</p>
                <a href="${resetUrl}" class="button">Tilbakestill passord</a>
                <div class="warning">
                    <strong>Viktig:</strong> Denne lenken utløper om 1 time av sikkerhetshensyn.
                </div>
                <p>Hvis du ikke ba om å tilbakestille passordet, kan du ignorere denne e-posten. Passordet ditt vil ikke bli endret.</p>
                <p>Hvis knappen ikke fungerer, kan du kopiere og lime inn denne lenken i nettleseren din:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
            </div>
            <div class="footer">
                <p>Med vennlig hilsen,<br>Helseriet-teamet</p>
                <p>Denne e-posten ble sendt til deg</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getPasswordResetTextVersion(name: string, resetUrl: string): string {
    return `
Hei ${name}!

Du har bedt om å tilbakestille passordet ditt for Helseriet-kontoen din.

Besøk denne lenken for å opprette et nytt passord:
${resetUrl}

VIKTIG: Denne lenken utløper om 1 time av sikkerhetshensyn.

Hvis du ikke ba om å tilbakestille passordet, kan du ignorere denne e-posten. Passordet ditt vil ikke bli endret.

Med vennlig hilsen,
Helseriet-teamet
    `;
  }

  private getWelcomeTemplate(name: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Velkommen til Helseriet!</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #9CAF88; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .content h2 { color: #333; margin-top: 0; }
            .content p { color: #666; line-height: 1.6; }
            .button { display: inline-block; padding: 15px 30px; background-color: #9CAF88; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; background-color: #f8f8f8; text-align: center; font-size: 14px; color: #888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Velkommen til Helseriet!</h1>
            </div>
            <div class="content">
                <h2>Hei ${name}!</h2>
                <p>Takk for at du opprettet en konto hos Helseriet. Vi er glade for å ha deg med oss på reisen mot bedre helse og velvære.</p>
                <p>Hos oss finner du et nøye utvalgt sortiment av kosttilskudd, yoga- og wellness-produkter som støtter din helhetlige livsstil.</p>
                <a href="${process.env.FRONTEND_URL}/produkter" class="button">Utforsk produktene våre</a>
                <p>Hvis du har spørsmål eller trenger hjelp, er vi her for deg. Ikke nøl med å ta kontakt!</p>
            </div>
            <div class="footer">
                <p>Med vennlig hilsen,<br>Helseriet-teamet</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getWelcomeTextVersion(name: string): string {
    return `
Velkommen til Helseriet!

Hei ${name}!

Takk for at du opprettet en konto hos Helseriet. Vi er glade for å ha deg med oss på reisen mot bedre helse og velvære.

Hos oss finner du et nøye utvalgt sortiment av kosttilskudd, yoga- og wellness-produkter som støtter din helhetlige livsstil.

Besøk ${process.env.FRONTEND_URL}/produkter for å utforske produktene våre.

Hvis du har spørsmål eller trenger hjelp, er vi her for deg. Ikke nøl med å ta kontakt!

Med vennlig hilsen,
Helseriet-teamet
    `;
  }

  private getOrderConfirmationTemplate(name: string, orderNumber: string, totalAmount: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ordrebekreftelse</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #9CAF88; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .content h2 { color: #333; margin-top: 0; }
            .content p { color: #666; line-height: 1.6; }
            .order-info { background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; background-color: #f8f8f8; text-align: center; font-size: 14px; color: #888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Ordrebekreftelse</h1>
            </div>
            <div class="content">
                <h2>Hei ${name}!</h2>
                <p>Takk for din bestilling hos Helseriet. Vi har mottatt ordren din og behandler den nå.</p>
                <div class="order-info">
                    <p><strong>Ordrenummer:</strong> ${orderNumber}</p>
                    <p><strong>Totalbeløp:</strong> ${totalAmount.toFixed(2)} NOK</p>
                </div>
                <p>Du vil motta en ny e-post når ordren din er sendt med sporingsinformasjon.</p>
                <p>Hvis du har spørsmål om ordren din, kan du kontakte vår kundeservice.</p>
            </div>
            <div class="footer">
                <p>Med vennlig hilsen,<br>Helseriet-teamet</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getOrderConfirmationTextVersion(name: string, orderNumber: string, totalAmount: number): string {
    return `
Ordrebekreftelse - Helseriet

Hei ${name}!

Takk for din bestilling hos Helseriet. Vi har mottatt ordren din og behandler den nå.

Ordrenummer: ${orderNumber}
Totalbeløp: ${totalAmount.toFixed(2)} NOK

Du vil motta en ny e-post når ordren din er sendt med sporingsinformasjon.

Hvis du har spørsmål om ordren din, kan du kontakte vår kundeservice.

Med vennlig hilsen,
Helseriet-teamet
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();