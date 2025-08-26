import { emailService } from '@/config/email';
import { OrderConfirmationData, OrderItem, OrderShipping } from '@/config/email';

/**
 * Test/eksempel på hvordan man bruker den nye ordrebekreftelse e-post template
 */
export async function testOrderConfirmationEmail(): Promise<void> {
  // Eksempel ordre data
  const mockOrderData: OrderConfirmationData = {
    orderNumber: 'HK-2024-001523',
    orderDate: new Date(),
    items: [
      {
        id: '1',
        name: 'Omega-3 Premium',
        description: '180 kapsler - Høykonsentrert fiskeoljer',
        sku: 'HK-OM3-180',
        quantity: 2,
        price: 299,
        isSubscription: false
      },
      {
        id: '2',
        name: 'Multivitamin Komplett',
        description: '90 tabletter - Komplett vitamintilskudd',
        sku: 'HK-MV-90',
        quantity: 1,
        price: 249,
        isSubscription: true
      },
      {
        id: '3',
        name: 'Vitamin D3',
        description: '100 kapsler - 50μg',
        sku: 'HK-D3-100',
        quantity: 1,
        price: 199,
        isSubscription: false
      }
    ],
    subtotal: 1046,
    shippingCost: 59,
    discount: 104,
    discountCode: 'HELSE10',
    totalAmount: 1001,
    paymentMethod: 'Visa ****1234',
    shipping: {
      name: 'Kari Nordmann',
      address: 'Storgata 123',
      city: 'Oslo',
      postalCode: '0123',
      country: 'Norge',
      phone: '+47 123 45 678',
      method: 'Standard levering',
      cost: 59
    },
    estimatedDelivery: '2-4 virkedager',
    trackingUrl: 'https://posten.no/tracking/123456789'
  };

  try {
    // Send test e-post
    await emailService.sendOrderConfirmationEmail(
      'test@example.com',
      mockOrderData,
      'Kari'
    );

    console.log('✅ Test ordrebekreftelse e-post sendt!');
    console.log('📧 E-post sendt til: test@example.com');
    console.log('🛍️ Ordrenummer:', mockOrderData.orderNumber);
    console.log('💰 Totalbeløp:', mockOrderData.totalAmount, 'kr');
  } catch (error) {
    console.error('❌ Feil ved sending av test e-post:', error);
  }
}

/**
 * Genererer eksempel data for ordre med kun engangskjøp
 */
export function getMockOneTimeOrderData(): OrderConfirmationData {
  return {
    orderNumber: 'HK-2024-001524',
    orderDate: new Date(),
    items: [
      {
        id: '1',
        name: 'Yoga Akupressurmatte',
        description: 'Premium akupressurmatte med naturlige materialer',
        sku: 'YG-MAT-001',
        quantity: 1,
        price: 599,
        isSubscription: false
      },
      {
        id: '2', 
        name: 'Essential Oil Diffuser',
        description: 'Ultrasonisk aromaterapi diffuser',
        sku: 'YG-DIF-001',
        quantity: 1,
        price: 399,
        isSubscription: false
      }
    ],
    subtotal: 998,
    shippingCost: 0,
    totalAmount: 998,
    paymentMethod: 'Klarna',
    shipping: {
      name: 'Erik Hansen',
      address: 'Hovedveien 456',
      city: 'Bergen', 
      postalCode: '5010',
      country: 'Norge',
      method: 'Gratis frakt (over 500 kr)',
      cost: 0
    },
    estimatedDelivery: '1-3 virkedager'
  };
}

/**
 * Genererer eksempel data for ordre med kun abonnement
 */
export function getMockSubscriptionOrderData(): OrderConfirmationData {
  return {
    orderNumber: 'HK-2024-001525', 
    orderDate: new Date(),
    items: [
      {
        id: '1',
        name: 'Helseriet Superfood Mix',
        description: 'Månedlig superfood blend - alltid fersk',
        sku: 'SF-MIX-SUB',
        quantity: 1,
        price: 349,
        isSubscription: true
      },
      {
        id: '2',
        name: 'Probiotika Advanced',
        description: '30 kapsler - høydose probiotika',
        sku: 'PR-ADV-SUB',
        quantity: 1,
        price: 299,
        isSubscription: true
      }
    ],
    subtotal: 648,
    shippingCost: 39,
    totalAmount: 687,
    paymentMethod: 'Vipps Abonnement',
    shipping: {
      name: 'Lisa Andersen',
      address: 'Fjellveien 789',
      city: 'Trondheim',
      postalCode: '7010', 
      country: 'Norge',
      phone: '+47 987 65 432',
      method: 'Standard levering',
      cost: 39
    },
    estimatedDelivery: '2-4 virkedager'
  };
}

/**
 * Hjelpefunksjon for å teste ulike ordre-typer
 */
export async function runAllEmailTemplateTests(): Promise<void> {
  console.log('🚀 Starter test av e-post templates...\n');
  
  // Test 1: Blandet ordre (både engangskjøp og abonnement)
  console.log('📧 Test 1: Blandet ordre');
  await testOrderConfirmationEmail();
  
  // Test 2: Kun engangskjøp
  console.log('\n📧 Test 2: Kun engangskjøp');
  const oneTimeOrder = getMockOneTimeOrderData();
  try {
    await emailService.sendOrderConfirmationEmail(
      'oneTime@test.com',
      oneTimeOrder,
      'Erik'
    );
    console.log('✅ Engangskjøp e-post sendt!');
  } catch (error) {
    console.error('❌ Feil:', error);
  }
  
  // Test 3: Kun abonnement
  console.log('\n📧 Test 3: Kun abonnement');
  const subscriptionOrder = getMockSubscriptionOrderData();
  try {
    await emailService.sendOrderConfirmationEmail(
      'subscription@test.com',
      subscriptionOrder,
      'Lisa'
    );
    console.log('✅ Abonnement e-post sendt!');
  } catch (error) {
    console.error('❌ Feil:', error);
  }
  
  console.log('\n🎉 Alle e-post template tester fullført!');
}

// For å kjøre testene:
// import { runAllEmailTemplateTests } from '@/utils/emailTemplateTest';
// await runAllEmailTemplateTests();