import { NextResponse } from 'next/server';
import { db, payments } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { ApiResponse, Payment } from '@/types';

// POST /api/payments/capture - Capture an authorized payment
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Payment>>> {
  try {
    const body = await request.json();
    const { paymentId, amount } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required', status: 400 },
        { status: 400 }
      );
    }

    try {
      // Find payment in database
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.providerPaymentId, paymentId))
        .limit(1);

      if (!existingPayment.length) {
        return NextResponse.json(
          { error: 'Payment not found', status: 404 },
          { status: 404 }
        );
      }

      // Check if payment is already captured
      if (existingPayment[0].status === 'captured') {
        return NextResponse.json(
          { error: 'Payment is already captured', status: 400 },
          { status: 400 }
        );
      }

      // Capture payment in Razorpay
      const captureAmount = amount || existingPayment[0].amount;
      const capturedPayment = await razorpay.payments.capture(paymentId, captureAmount, existingPayment[0].currency);

      // Update payment status in database with comprehensive capture info
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status: 'captured',
          captureId: capturedPayment.id,
          capturedAmount: capturedPayment.amount,
          capturedAt: new Date(capturedPayment.captured_at * 1000),
          captureMethod: capturedPayment.method || 'manual',
          captureFee: capturedPayment.fee || 0,
          captureReference: capturedPayment.acquirer_data?.transaction_id || null,
          metadata: {
            ...existingPayment[0].metadata,
            capture: capturedPayment,  // Store the full capture response
          },
        })
        .where(eq(payments.providerPaymentId, paymentId))
        .returning();

      return NextResponse.json({
        data: updatedPayment,
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay payment capture error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 