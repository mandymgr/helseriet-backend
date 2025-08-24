# E-post Templates - Helseriet

Denne filen dokumenterer e-post templates som brukes i Helseriet platformen.

## 📧 Ordrebekreftelse Template

### Oversikt
Komplett ordrebekreftelse template som sendes automatisk når en betaling blir bekreftet.

### Features
- ✅ **Responsive design** - Fungerer på alle enheter
- ✅ **Brand styling** - Helseriet farger (sage #9CAF88)
- ✅ **Abonnement støtte** - Separate seksjoner for engangskjøp og abonnement
- ✅ **Komplett ordreinfo** - Alle produkter, priser, frakt, rabatter
- ✅ **Leveringsdetaljer** - Adresse og estimert leveringstid  
- ✅ **Call-to-action buttons** - Lenker til konto og videre shopping
- ✅ **Text fallback** - Plain text versjon for eldre e-post klienter

### Automatisk Sending
E-posten sendes automatisk når:
1. Betalingen blir bekreftet i `PaymentController.confirmPayment()`
2. Order status oppdateres til `CONFIRMED`
3. Payment status blir `COMPLETED`

### Template Sections

#### 1. Header
```
🌿 Helseriet
✓ Ordre bekreftet
```

#### 2. Engangskjøp (hvis relevant)
```
🛍️ ENGANGSKJØP
• Product navn
  Beskrivelse
  Varenr: SKU • Antall: 2
  Pris: 599 kr
```

#### 3. Abonnement (hvis relevant)
```
🔄 ABONNEMENT  
• Product navn (ABONNEMENT)
  Beskrivelse
  Varenr: SKU • Antall: 1 • Månedlig leveranse
  Pris: 249 kr/mnd
```

#### 4. Leveringsadresse
```
📦 Leveringsadresse
Kari Nordmann
Storgata 123
0123 Oslo
Norge
Telefon: +47 123 45 678

Leveringsmåte: Standard levering
Estimert levering: 2-4 virkedager
```

#### 5. Betalingsoversikt
```
💰 Betalingsoversikt
Delsum: 1046 kr
Frakt (Standard levering): 59 kr
Rabatt (HELSE10): -104 kr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTALT BETALT: 1001 kr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Betalingsmetode: Visa ****1234
```

#### 6. Neste Steg
```
📦 HVA SKJER NÅ?
Vi pakker ordren din og sender den innen 1-2 virkedager.
Du får beskjed med sporingsnummer når pakken er på vei!
```

#### 7. Call-to-Action
```
[Se mine ordrer] [Fortsett shopping]
```

#### 8. Footer
```
Takk for at du valgte Helseriet! 🌱
Kundeservice | Retur & bytte | FAQ
```

## 🔧 Teknisk Implementering

### Interface: `OrderConfirmationData`
```typescript
interface OrderConfirmationData {
  orderNumber: string;           // HK-2024-001523
  orderDate: Date;               // Bestillingsdato
  items: OrderItem[];            // Produkter i ordren
  subtotal: number;              // Delsum
  shippingCost: number;          // Fraktkost
  discount?: number;             // Rabattbeløp
  discountCode?: string;         // Rabattkode (f.eks. HELSE10)
  totalAmount: number;           // Totalbeløp
  paymentMethod: string;         // Betalingsmåte
  shipping: OrderShipping;       // Leveringsadresse
  trackingUrl?: string;          // Sporingslenke (fremtidig bruk)
  estimatedDelivery?: string;    // Estimert leveringstid
}
```

### Interface: `OrderItem`
```typescript
interface OrderItem {
  id: string;                    // Produkt ID
  name: string;                  // Produktnavn
  description?: string;          // Produktbeskrivelse
  sku?: string;                  // Varenummer
  quantity: number;              // Antall
  price: number;                 // Enhetspris
  isSubscription?: boolean;      // Om det er et abonnement
}
```

### Interface: `OrderShipping`
```typescript
interface OrderShipping {
  name: string;                  // Kundens navn
  address: string;               // Adresse
  city: string;                  // By
  postalCode: string;            // Postnummer
  country: string;               // Land
  phone?: string;                // Telefonnummer
  method: string;                // Leveringsmåte
  cost: number;                  // Fraktkost
}
```

### Bruk i Code

#### 1. Automatisk via Payment Controller
```typescript
// I PaymentController.confirmPayment()
if (paymentResult.success) {
  await this.sendOrderConfirmationEmail(payment.orderId);
}
```

#### 2. Manuell sending
```typescript
import { emailService, OrderConfirmationData } from '@/config/email';

const orderData: OrderConfirmationData = {
  orderNumber: 'HK-2024-001523',
  orderDate: new Date(),
  items: [...],
  // ... resten av data
};

await emailService.sendOrderConfirmationEmail(
  'kunde@example.com',
  orderData,
  'Kari'  // Fornavn (valgfritt)
);
```

## 🎨 Styling

### Farger
- **Primary**: `#9CAF88` (sage)
- **Secondary**: `#8BA373` (sage dark)
- **Accent**: `#D4A574` (terracotta)
- **Text**: `#2D3436` (charcoal)
- **Text Light**: `#636e72`
- **Success**: `#00b894`
- **Danger**: `#e17055`

### Typography  
- **Font**: Helvetica Neue, Arial, sans-serif
- **Headers**: ui-serif, Georgia, Cambria, serif
- **Body**: 15px line-height 1.6
- **Small**: 14px
- **Large**: 18px

### Layout
- **Max Width**: 700px
- **Mobile**: Responsive design med flexbox
- **Spacing**: Consistent padding og margins
- **Borders**: 12px border-radius
- **Shadows**: Subtle box-shadow på containers

## 🧪 Testing

### Test Script
```bash
# Backend
cd helseriet-backend
npm run test:email-templates

# Eller manuelt:
import { runAllEmailTemplateTests } from '@/utils/emailTemplateTest';
await runAllEmailTemplateTests();
```

### Test Cases
1. **Blandet ordre** - Både engangskjøp og abonnement
2. **Kun engangskjøp** - Bare vanlige produkter
3. **Kun abonnement** - Bare abonnement produkter
4. **Med rabatt** - Ordre med rabattkode
5. **Uten rabatt** - Standard ordre
6. **Gratis frakt** - Ordre over frakt-grense
7. **Ulike betalingsmåter** - Stripe, Vipps, Klarna, PayPal

## 📱 Responsivt Design

### Mobile (<600px)
- **Single column** layout
- **Stacked** item display
- **Larger** touch targets  
- **Condensed** spacing

### Tablet (600px-900px)
- **Optimized** for tablet viewing
- **Balanced** content width
- **Touch-friendly** buttons

### Desktop (>900px)
- **Full width** utilization
- **Optimal** reading experience
- **Hover** effects på buttons

## 🔮 Fremtidige Forbedringer

### v2.0 Features
- [ ] **Tracking integration** - Automatisk sporingsnummer
- [ ] **Product images** - Bilder i e-post
- [ ] **PDF vedlegg** - Faktura som PDF
- [ ] **Delivery notifications** - Status oppdateringer
- [ ] **Review requests** - Be om produktanmeldelser
- [ ] **Personalization** - Personaliserte anbefalinger

### v2.1 Features  
- [ ] **Multi-language** - Engelsk støtte
- [ ] **Dark mode** - Mørk tema versjon
- [ ] **Interactive elements** - Knapper for actions
- [ ] **Social sharing** - Del kjøp på sosiale medier
- [ ] **Loyalty points** - Vis bonus poeng
- [ ] **Cross-selling** - Anbefal relaterte produkter

## 📊 Analytics & Metrics

### Sporing (fremtidig)
- **Open rate** - Hvor mange åpner e-posten
- **Click rate** - Klikk på CTA buttons
- **Conversion** - Videre shopping etter e-post
- **Device** - Mobile vs desktop åpning
- **Time** - Når e-posten åpnes

### KPIs
- **Delivery rate** > 95%
- **Open rate** > 25% 
- **Click rate** > 5%
- **Customer satisfaction** > 4.5/5
- **Template loading time** < 3s

---

**Sist oppdatert:** 24. august 2025  
**Versjon:** 1.0.0  
**Ansvarlig:** Claude Code Integration Team