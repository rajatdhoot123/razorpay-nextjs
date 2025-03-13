import { NextResponse } from 'next/server';
import { db, payments } from '@/db';
import { razorpay, verifySignature } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { CreatePaymentRequest, VerifyPaymentRequest, Payment, ApiResponse } from '@/types';

// GET /api/payments - List all payments
export async function GET(): Promise<NextResponse<ApiResponse<Payment[]>>> {
  try {
    const allPayments = await db.select().from(payments);
    return NextResponse.json({
      data: allPayments,
      status: 200
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a recurring payment
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Payment>>> {
  try {
    const body = await request.json() as CreatePaymentRequest;
    const {
      email,
      contact,
      amount,
      currency = 'INR',
      orderId,
      customerId,
      token,
      recurring = '1',
      description,
      notes,
    } = body;

    // Validate required fields
    if (!email || !contact || !amount || !orderId || !customerId || !token) {
      return NextResponse.json(
        { 
          error: 'Email, contact, amount, orderId, customerId, and token are required fields', 
          status: 400 
        },
        { status: 400 }
      );
    }

    try {
      // Create recurring payment in Razorpay
      const razorpayPayment = await razorpay.payments.createRecurringPayment({
        email,
        contact,
        amount,
        currency,
        order_id: orderId,
        customer_id: customerId,
        token,
        recurring,
        description,
        notes,
      });

      // Store payment in database
      const [payment] = await db
        .insert(payments)
        .values({
          id: razorpayPayment.id,
          orderId,
          customerId,
          amount,
          currency,
          status: 'created',
          provider: 'razorpay',
          providerPaymentId: razorpayPayment.id,
          recurring,
          metadata: razorpayPayment,
        })
        .returning();

      return NextResponse.json({
        data: payment,
        status: 201
      }, { status: 201 });
    } catch (razorpayError: any) {
      console.error('Razorpay payment creation error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// PATCH /api/payments - Verify payment signature
export async function PATCH(request: Request): Promise<NextResponse<ApiResponse<Payment>>> {
  try {
    const body = await request.json() as VerifyPaymentRequest;
    const { orderId, paymentId, signature } = body;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Order ID, payment ID, and signature are required fields', status: 400 },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifySignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature', status: 400 },
        { status: 400 }
      );
    }

    try {
      // Update payment status
      const [payment] = await db
        .update(payments)
        .set({
          status: 'authorized',
          razorpaySignature: signature,
        })
        .where(eq(payments.providerPaymentId, paymentId))
        .returning();

      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found', status: 404 },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: payment,
        status: 200
      });
    } catch (dbError: any) {
      console.error('Database error during payment verification:', dbError);
      return NextResponse.json(
        { error: dbError.message, status: 500 },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 