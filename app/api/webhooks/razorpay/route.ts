import { NextResponse } from 'next/server';
import { db, payments, orders, registrationInvoices } from '@/db';
import { verifySignature } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';

// Set of processed event IDs for idempotency
// Note: In a production environment, this should be stored in a database
const processedEventIds = new Set<string>();

// POST /api/webhooks/razorpay - Handle Razorpay webhook events
export async function POST(request: Request) {
  try {
    // Get the raw request body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
    // Get the Razorpay signature and event ID from headers
    const signature = request.headers.get('x-razorpay-signature');
    const eventId = request.headers.get('x-razorpay-event-id');
    
    if (!signature) {
      console.error('Webhook Error: No signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 401 }
      );
    }

    // Check for duplicate events (idempotency)
    if (eventId && processedEventIds.has(eventId)) {
      console.log(`Duplicate webhook event received: ${eventId}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Webhook Error: Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const { event, payload } = body;
    console.log(`Webhook received: ${event}`);

    // Handle different event types
    switch (event) {
      // Payment events
      case 'payment.authorized':
        await handlePaymentAuthorized(payload);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      
      case 'order.paid':
        await handleOrderPaid(payload);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(payload);
        break;
      
      case 'invoice.expired':
        await handleInvoiceExpired(payload);
        break;
      
      // Token events for recurring payments
      case 'token.confirmed':
        await handleTokenConfirmed(payload);
        break;
        
      case 'token.rejected':
        await handleTokenRejected(payload);
        break;
        
      case 'token.cancelled':
        await handleTokenCancelled(payload);
        break;
        
      case 'token.paused':
        await handleTokenPaused(payload);
        break;
        
      // Notification events
      case 'order.notification.delivered':
        await handleNotificationDelivered(payload);
        break;
        
      case 'order.notification.failed':
        await handleNotificationFailed(payload);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    // Store event ID to prevent duplicate processing
    if (eventId) {
      processedEventIds.add(eventId);
      
      // Limit the size of the Set to prevent memory leaks
      // In a production environment, this should be handled with a TTL-based cache or database
      if (processedEventIds.size > 1000) {
        const iterator = processedEventIds.values();
        const firstValue = iterator.next().value;
        if (firstValue) {
          processedEventIds.delete(firstValue);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Verify webhook signature
function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  try {
    // Use the webhook secret from environment variables
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not defined');
      return false;
    }

    // Create HMAC using the webhook secret
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Compare the computed signature with the provided one
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Handle payment.authorized event
async function handlePaymentAuthorized(payload: any) {
  const { payment } = payload;
  
  try {
    // Check if payment exists in database
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, payment.id))
      .limit(1);

    if (existingPayment.length) {
      // Update existing payment
      await db
        .update(payments)
        .set({
          status: 'authorized',
          metadata: payment,
        })
        .where(eq(payments.providerPaymentId, payment.id));
    } else {
      // Create new payment record
      await db
        .insert(payments)
        .values({
          id: payment.id,
          orderId: payment.order_id,
          customerId: payment.customer_id || 'unknown',
          amount: payment.amount,
          currency: payment.currency,
          status: 'authorized',
          provider: 'razorpay',
          providerPaymentId: payment.id,
          recurring: payment.recurring ? '1' : '0',
          metadata: payment,
        });
    }

    console.log(`Payment authorized: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment.authorized webhook:', error);
  }
}

// Handle payment.failed event
async function handlePaymentFailed(payload: any) {
  const { payment } = payload;
  
  try {
    // Check if payment exists in database
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, payment.id))
      .limit(1);

    if (existingPayment.length) {
      // Update existing payment
      await db
        .update(payments)
        .set({
          status: 'failed',
          metadata: {
            ...existingPayment[0].metadata,
            ...payment,
            error_code: payment.error_code,
            error_description: payment.error_description,
            failed_at: Math.floor(Date.now() / 1000)
          },
        })
        .where(eq(payments.providerPaymentId, payment.id));
    } else {
      // Create new payment record
      await db
        .insert(payments)
        .values({
          id: payment.id,
          orderId: payment.order_id,
          customerId: payment.customer_id || 'unknown',
          amount: payment.amount,
          currency: payment.currency,
          status: 'failed',
          provider: 'razorpay',
          providerPaymentId: payment.id,
          recurring: payment.recurring ? '1' : '0',
          metadata: {
            ...payment,
            failed_at: Math.floor(Date.now() / 1000)
          },
        });
    }

    console.log(`Payment failed: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment.failed webhook:', error);
  }
}

// Handle payment.captured event
async function handlePaymentCaptured(payload: any) {
  const { payment } = payload;
  
  try {
    // Check if payment exists in database
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, payment.id))
      .limit(1);

    if (existingPayment.length) {
      // Update existing payment with comprehensive capture info
      await db
        .update(payments)
        .set({
          status: 'captured',
          captureId: payment.id,
          capturedAmount: payment.amount,
          capturedAt: new Date(payment.captured_at * 1000),
          captureMethod: payment.method || 'automatic',
          captureFee: payment.fee || 0,
          captureReference: payment.acquirer_data?.transaction_id || null,
          metadata: {
            ...existingPayment[0].metadata,
            capture: payment,  // Store the full capture response
          },
        })
        .where(eq(payments.providerPaymentId, payment.id));
    } else {
      // Create new payment record with comprehensive capture info
      await db
        .insert(payments)
        .values({
          id: payment.id,
          orderId: payment.order_id,
          customerId: payment.customer_id || 'unknown',
          amount: payment.amount,
          currency: payment.currency,
          status: 'captured',
          provider: 'razorpay',
          providerPaymentId: payment.id,
          recurring: payment.recurring ? '1' : '0',
          captureId: payment.id,
          capturedAmount: payment.amount,
          capturedAt: new Date(payment.captured_at * 1000),
          captureMethod: payment.method || 'automatic',
          captureFee: payment.fee || 0,
          captureReference: payment.acquirer_data?.transaction_id || null,
          metadata: {
            capture: payment,
          },
        });
    }

    console.log(`Payment captured: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment.captured webhook:', error);
  }
}

// Handle order.paid event
async function handleOrderPaid(payload: any) {
  const { order } = payload;
  
  try {
    // Update order status
    await db
      .update(orders)
      .set({
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    console.log(`Order paid: ${order.id}`);
  } catch (error) {
    console.error('Error handling order.paid webhook:', error);
  }
}

// Handle invoice.paid event
async function handleInvoicePaid(payload: any) {
  const { invoice, payment } = payload;
  
  try {
    // Update invoice status
    await db
      .update(registrationInvoices)
      .set({
        status: 'paid',
        paidAt: Math.floor(Date.now() / 1000),
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        paymentId: payment?.id,
      })
      .where(eq(registrationInvoices.id, invoice.id));

    console.log(`Invoice paid: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.paid webhook:', error);
  }
}

// Handle invoice.expired event
async function handleInvoiceExpired(payload: any) {
  const { invoice } = payload;
  
  try {
    // Update invoice status
    await db
      .update(registrationInvoices)
      .set({
        status: 'expired',
        expiredAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(registrationInvoices.id, invoice.id));

    console.log(`Invoice expired: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.expired webhook:', error);
  }
}

// Handle token.confirmed event
async function handleTokenConfirmed(payload: any) {
  const { token } = payload;
  
  try {
    // Find orders using this token
    const relatedOrders = await db
      .select()
      .from(orders)
      .where(
        eq((orders.token as any)?.id, token.id)
      );

    for (const order of relatedOrders) {
      // Update order with token status
      await db
        .update(orders)
        .set({
          token: {
            ...order.token,
            recurring_details: {
              status: 'confirmed',
            },
            updated_at: Math.floor(Date.now() / 1000)
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    console.log(`Token confirmed: ${token.id}`);
  } catch (error) {
    console.error('Error handling token.confirmed webhook:', error);
  }
}

// Handle token.rejected event
async function handleTokenRejected(payload: any) {
  const { token } = payload;
  
  try {
    // Find orders using this token
    const relatedOrders = await db
      .select()
      .from(orders)
      .where(
        eq((orders.token as any)?.id, token.id)
      );

    for (const order of relatedOrders) {
      // Update order with token status
      await db
        .update(orders)
        .set({
          token: {
            ...order.token,
            recurring_details: {
              status: 'rejected',
              failure_reason: token.recurring_details?.failure_reason || 'Unknown reason'
            },
            updated_at: Math.floor(Date.now() / 1000)
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    console.log(`Token rejected: ${token.id}`);
  } catch (error) {
    console.error('Error handling token.rejected webhook:', error);
  }
}

// Handle token.cancelled event
async function handleTokenCancelled(payload: any) {
  const { token } = payload;
  
  try {
    // Find orders using this token
    const relatedOrders = await db
      .select()
      .from(orders)
      .where(
        eq((orders.token as any)?.id, token.id)
      );

    for (const order of relatedOrders) {
      // Update order with token status
      await db
        .update(orders)
        .set({
          token: {
            ...order.token,
            recurring_details: {
              status: 'cancelled',
              failure_reason: token.recurring_details?.failure_reason || null
            },
            updated_at: Math.floor(Date.now() / 1000)
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    console.log(`Token cancelled: ${token.id}`);
  } catch (error) {
    console.error('Error handling token.cancelled webhook:', error);
  }
}

// Handle token.paused event
async function handleTokenPaused(payload: any) {
  const { token } = payload;
  
  try {
    // Find orders using this token
    const relatedOrders = await db
      .select()
      .from(orders)
      .where(
        eq((orders.token as any)?.id, token.id)
      );

    for (const order of relatedOrders) {
      // Update order with token status
      await db
        .update(orders)
        .set({
          token: {
            ...order.token,
            recurring_details: {
              status: 'paused',
              failure_reason: token.recurring_details?.failure_reason || null
            },
            updated_at: Math.floor(Date.now() / 1000)
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    console.log(`Token paused: ${token.id}`);
  } catch (error) {
    console.error('Error handling token.paused webhook:', error);
  }
}

// Handle notification.delivered event
async function handleNotificationDelivered(payload: any) {
  const { notification } = payload;
  
  try {
    // Store notification information in the order
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, notification.order_id))
      .limit(1);

    if (order.length) {
      await db
        .update(orders)
        .set({
          notes: {
            ...order[0].notes,
            notification: {
              id: notification.id,
              status: 'delivered',
              delivered_at: notification.delivered_at,
              payment_after: notification.payment_after
            }
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, notification.order_id));
    }

    console.log(`Notification delivered for order: ${notification.order_id}`);
  } catch (error) {
    console.error('Error handling notification.delivered webhook:', error);
  }
}

// Handle notification.failed event
async function handleNotificationFailed(payload: any) {
  const { notification } = payload;
  
  try {
    // Store notification information in the order
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, notification.order_id))
      .limit(1);

    if (order.length) {
      await db
        .update(orders)
        .set({
          notes: {
            ...order[0].notes,
            notification: {
              id: notification.id,
              status: 'failed',
              delivered_at: null,
              payment_after: notification.payment_after
            }
          },
          updatedAt: new Date(),
        })
        .where(eq(orders.id, notification.order_id));
    }

    console.log(`Notification failed for order: ${notification.order_id}`);
  } catch (error) {
    console.error('Error handling notification.failed webhook:', error);
  }
} 