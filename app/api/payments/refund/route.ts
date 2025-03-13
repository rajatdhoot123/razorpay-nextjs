import { NextResponse } from 'next/server';
import { db, payments } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { ApiResponse, Payment } from '@/types';

// POST /api/payments/refund - Refund a payment
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Payment>>> {
  try {
    const body = await request.json();
    const { paymentId, amount, notes, speed = 'normal' } = body;

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

      // Check if payment is captured
      if (existingPayment[0].status !== 'captured') {
        return NextResponse.json(
          { error: 'Only captured payments can be refunded', status: 400 },
          { status: 400 }
        );
      }

      // Create refund in Razorpay
      const refundOptions: any = { speed };
      if (amount) refundOptions.amount = amount;
      if (notes) refundOptions.notes = notes;

      const refund = await razorpay.payments.refund(paymentId, refundOptions);

      // Update payment status in database
      const refundAmount = refund.amount;
      const fullRefund = refundAmount === existingPayment[0].amount;
      
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status: fullRefund ? 'refunded' : 'partially_refunded',
          metadata: {
            ...existingPayment[0].metadata,
            refund_status: fullRefund ? 'full' : 'partial',
            amount_refunded: (existingPayment[0].metadata?.amount_refunded || 0) + refundAmount,
            refunds: [
              ...(existingPayment[0].metadata?.refunds || []),
              refund
            ],
            refunded_at: Math.floor(Date.now() / 1000)
          },
        })
        .where(eq(payments.providerPaymentId, paymentId))
        .returning();

      return NextResponse.json({
        data: updatedPayment,
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay refund error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error refunding payment:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 