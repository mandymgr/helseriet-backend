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

export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  price: number;
  isSubscription?: boolean;
}

export interface OrderShipping {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  method: string;
  cost: number;
}

export interface OrderConfirmationData {
  orderNumber: string;
  orderDate: Date;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount?: number;
  discountCode?: string;
  totalAmount: number;
  paymentMethod: string;
  shipping: OrderShipping;
  trackingUrl?: string;
  estimatedDelivery?: string;
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
    orderData: OrderConfirmationData,
    firstName?: string
  ): Promise<void> {
    const name = firstName || 'Kunde';

    const mailOptions = {
      from: {
        name: 'Helseriet',
        address: process.env.SMTP_USER || 'noreply@helseriet.no'
      },
      to: email,
      subject: `Ordrebekreftelse - #${orderData.orderNumber}`,
      html: this.getOrderConfirmationTemplate(name, orderData),
      text: this.getOrderConfirmationTextVersion(name, orderData)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Order confirmation email sent to ${email}`, { messageId: info.messageId, orderNumber: orderData.orderNumber });
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

  private getOrderConfirmationTemplate(name: string, orderData: OrderConfirmationData): string {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const subscriptionItems = orderData.items.filter(item => item.isSubscription);
    const oneTimeItems = orderData.items.filter(item => !item.isSubscription);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ordrebekreftelse - Helseriet</title>
        <style>
            body { 
                font-family: 'Helvetica Neue', Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                background-color: #f5f6f4; 
                line-height: 1.6;
            }
            .container { 
                max-width: 700px; 
                margin: 0 auto; 
                background-color: white; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                margin-top: 20px;
                margin-bottom: 20px;
            }
            .header { 
                background: linear-gradient(135deg, #9CAF88 0%, #8BA373 100%); 
                padding: 40px 30px; 
                text-align: center; 
                color: white;
            }
            .header h1 { 
                color: white; 
                margin: 0; 
                font-size: 28px; 
                font-weight: 300;
                letter-spacing: 1px;
            }
            .success-badge {
                display: inline-block;
                background-color: rgba(255,255,255,0.2);
                padding: 8px 20px;
                border-radius: 25px;
                margin-top: 15px;
                font-size: 14px;
                font-weight: 500;
            }
            .content { 
                padding: 40px 30px; 
            }
            .content h2 { 
                color: #2D3436; 
                margin-top: 0; 
                font-size: 24px;
                font-weight: 400;
            }
            .content p { 
                color: #636e72; 
                line-height: 1.8; 
                margin: 16px 0;
            }
            .order-header {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 25px;
                border-radius: 12px;
                margin: 30px 0;
                border-left: 4px solid #9CAF88;
            }
            .order-number {
                font-size: 20px;
                font-weight: 600;
                color: #2D3436;
                margin-bottom: 8px;
            }
            .order-date {
                color: #636e72;
                font-size: 14px;
            }
            .section {
                margin: 35px 0;
                padding: 25px;
                background-color: #fefefe;
                border: 1px solid #f1f3f4;
                border-radius: 8px;
            }
            .section h3 {
                color: #2D3436;
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 20px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #f1f3f4;
            }
            .item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 18px 0;
                border-bottom: 1px solid #f8f9fa;
            }
            .item:last-child {
                border-bottom: none;
            }
            .item-details {
                flex: 1;
            }
            .item-name {
                font-weight: 600;
                color: #2D3436;
                font-size: 16px;
                margin-bottom: 5px;
            }
            .item-description {
                color: #74b9ff;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .item-meta {
                color: #95a5a6;
                font-size: 13px;
            }
            .item-price {
                font-weight: 600;
                color: #2D3436;
                font-size: 16px;
                text-align: right;
                min-width: 80px;
            }
            .subscription-badge {
                display: inline-block;
                background-color: #D4A574;
                color: white;
                padding: 3px 10px;
                border-radius: 15px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
            }
            .summary {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 25px;
                border-radius: 12px;
                margin: 30px 0;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 12px 0;
                font-size: 15px;
            }
            .summary-row.total {
                border-top: 2px solid #dee2e6;
                padding-top: 15px;
                margin-top: 20px;
                font-weight: 700;
                font-size: 18px;
                color: #2D3436;
            }
            .discount {
                color: #00b894;
            }
            .shipping-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            .next-steps {
                background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
                color: white;
                padding: 25px;
                border-radius: 12px;
                text-align: center;
                margin: 30px 0;
            }
            .next-steps h3 {
                margin: 0 0 15px 0;
                font-size: 18px;
            }
            .next-steps p {
                margin: 0;
                color: rgba(255,255,255,0.9);
            }
            .button {
                display: inline-block;
                padding: 15px 30px;
                background: linear-gradient(135deg, #9CAF88 0%, #8BA373 100%);
                color: white;
                text-decoration: none;
                border-radius: 25px;
                margin: 20px 10px;
                font-weight: 500;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 15px rgba(156,175,136,0.3);
                transition: transform 0.2s ease;
            }
            .button:hover {
                transform: translateY(-2px);
            }
            .footer { 
                padding: 30px; 
                background-color: #2d3436; 
                text-align: center; 
                color: #b2bec3;
            }
            .footer h4 {
                color: white;
                margin: 0 0 15px 0;
                font-size: 18px;
                font-weight: 400;
            }
            .footer p {
                margin: 8px 0;
                font-size: 14px;
                line-height: 1.6;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                color: #74b9ff;
                text-decoration: none;
                margin: 0 10px;
                font-size: 14px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 30px 20px;
                }
                .item {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .item-price {
                    text-align: left;
                    margin-top: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌿 Helseriet</h1>
                <div class="success-badge">
                    ✓ Ordre bekreftet
                </div>
            </div>
            
            <div class="content">
                <h2>Takk for din bestilling, ${name}! 🎉</h2>
                <p>Vi har mottatt ordren din og behandler den med en gang. Du vil motta en bekreftelse når varene er sendt.</p>
                
                <div class="order-header">
                    <div class="order-number">Ordrenummer: #${orderData.orderNumber}</div>
                    <div class="order-date">Bestilt: ${formatDate(orderData.orderDate)}</div>
                </div>

                ${oneTimeItems.length > 0 ? `
                <div class="section">
                    <h3>🛍️ Engangskjøp</h3>
                    ${oneTimeItems.map(item => `
                    <div class="item">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                            <div class="item-meta">
                                ${item.sku ? `Varenr: ${item.sku} • ` : ''}
                                Antall: ${item.quantity}
                            </div>
                        </div>
                        <div class="item-price">${(item.price * item.quantity).toFixed(0)} kr</div>
                    </div>
                    `).join('')}
                </div>` : ''}

                ${subscriptionItems.length > 0 ? `
                <div class="section">
                    <h3>🔄 Abonnement</h3>
                    ${subscriptionItems.map(item => `
                    <div class="item">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                            <div class="item-meta">
                                ${item.sku ? `Varenr: ${item.sku} • ` : ''}
                                Antall: ${item.quantity} • Månedlig leveranse
                            </div>
                            <div class="subscription-badge">Abonnement</div>
                        </div>
                        <div class="item-price">${(item.price * item.quantity).toFixed(0)} kr/mnd</div>
                    </div>
                    `).join('')}
                </div>` : ''}

                <div class="section">
                    <h3>📦 Leveringsadresse</h3>
                    <div class="shipping-info">
                        <strong>${orderData.shipping.name}</strong><br>
                        ${orderData.shipping.address}<br>
                        ${orderData.shipping.postalCode} ${orderData.shipping.city}<br>
                        ${orderData.shipping.country}<br>
                        ${orderData.shipping.phone ? `<br>Telefon: ${orderData.shipping.phone}` : ''}
                        <br><br>
                        <strong>Leveringsmåte:</strong> ${orderData.shipping.method}
                        ${orderData.estimatedDelivery ? `<br><strong>Estimert levering:</strong> ${orderData.estimatedDelivery}` : ''}
                    </div>
                </div>

                <div class="summary">
                    <h3>💰 Betalingsoversikt</h3>
                    <div class="summary-row">
                        <span>Delsum</span>
                        <span>${orderData.subtotal.toFixed(0)} kr</span>
                    </div>
                    <div class="summary-row">
                        <span>Frakt (${orderData.shipping.method})</span>
                        <span>${orderData.shippingCost.toFixed(0)} kr</span>
                    </div>
                    ${orderData.discount ? `
                    <div class="summary-row discount">
                        <span>Rabatt${orderData.discountCode ? ` (${orderData.discountCode})` : ''}</span>
                        <span>-${orderData.discount.toFixed(0)} kr</span>
                    </div>` : ''}
                    <div class="summary-row total">
                        <span>Totalt betalt</span>
                        <span>${orderData.totalAmount.toFixed(0)} kr</span>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #636e72; font-size: 14px;">
                        <strong>Betalingsmetode:</strong> ${orderData.paymentMethod}
                    </div>
                </div>

                <div class="next-steps">
                    <h3>📬 Hva skjer nå?</h3>
                    <p>Vi pakker ordren din og sender den innen 1-2 virkedager. Du får beskjed med sporingsnummer når pakken er på vei!</p>
                </div>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL}/account" class="button">Se mine ordrer</a>
                    <a href="${process.env.FRONTEND_URL}/produkter" class="button">Fortsett shopping</a>
                </div>
            </div>

            <div class="footer">
                <h4>Takk for at du valgte Helseriet! 🌱</h4>
                <p>Vi er her for deg hvis du har spørsmål om ordren din.</p>
                <div class="social-links">
                    <a href="${process.env.FRONTEND_URL}/kontakt">Kundeservice</a>
                    <a href="${process.env.FRONTEND_URL}/retur">Retur & bytte</a>
                    <a href="${process.env.FRONTEND_URL}/faq">Ofte stillte spørsmål</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #95a5a6;">
                    Helseriet AS • Denne e-posten ble sendt til deg fordi du har handlet hos oss.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getOrderConfirmationTextVersion(name: string, orderData: OrderConfirmationData): string {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const subscriptionItems = orderData.items.filter(item => item.isSubscription);
    const oneTimeItems = orderData.items.filter(item => !item.isSubscription);

    return `
🌿 HELSERIET - Ordrebekreftelse

✓ Ordre bekreftet

Hei ${name}!

Takk for din bestilling hos Helseriet! 🎉
Vi har mottatt ordren din og behandler den med en gang.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDREINFORMASJON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ordrenummer: #${orderData.orderNumber}
Bestilt: ${formatDate(orderData.orderDate)}

${oneTimeItems.length > 0 ? `
🛍️ ENGANGSKJØP:
${oneTimeItems.map(item => `
• ${item.name}
  ${item.description || ''}
  ${item.sku ? `Varenr: ${item.sku} • ` : ''}Antall: ${item.quantity}
  Pris: ${(item.price * item.quantity).toFixed(0)} kr`).join('')}
` : ''}

${subscriptionItems.length > 0 ? `
🔄 ABONNEMENT:
${subscriptionItems.map(item => `
• ${item.name} (ABONNEMENT)
  ${item.description || ''}
  ${item.sku ? `Varenr: ${item.sku} • ` : ''}Antall: ${item.quantity} • Månedlig leveranse
  Pris: ${(item.price * item.quantity).toFixed(0)} kr/mnd`).join('')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEVERINGSADRESSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${orderData.shipping.name}
${orderData.shipping.address}
${orderData.shipping.postalCode} ${orderData.shipping.city}
${orderData.shipping.country}
${orderData.shipping.phone ? `Telefon: ${orderData.shipping.phone}` : ''}

Leveringsmåte: ${orderData.shipping.method}
${orderData.estimatedDelivery ? `Estimert levering: ${orderData.estimatedDelivery}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 BETALINGSOVERSIKT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Delsum: ${orderData.subtotal.toFixed(0)} kr
Frakt (${orderData.shipping.method}): ${orderData.shippingCost.toFixed(0)} kr
${orderData.discount ? `Rabatt${orderData.discountCode ? ` (${orderData.discountCode})` : ''}: -${orderData.discount.toFixed(0)} kr\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTALT BETALT: ${orderData.totalAmount.toFixed(0)} kr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Betalingsmetode: ${orderData.paymentMethod}

📦 HVA SKJER NÅ?

Vi pakker ordren din og sender den innen 1-2 virkedager. 
Du får beskjed med sporingsnummer når pakken er på vei!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se mine ordrer: ${process.env.FRONTEND_URL}/account
Fortsett shopping: ${process.env.FRONTEND_URL}/produkter

Kundeservice: ${process.env.FRONTEND_URL}/kontakt
Retur & bytte: ${process.env.FRONTEND_URL}/retur

Takk for at du valgte Helseriet! 🌱

Med vennlig hilsen,
Helseriet-teamet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Helseriet AS • Denne e-posten ble sendt til deg fordi du har handlet hos oss.
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