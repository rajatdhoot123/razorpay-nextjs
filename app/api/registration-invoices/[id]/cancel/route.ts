import { NextResponse } from 'next/server';
import { db, registrationInvoices } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { RegistrationInvoice, ApiResponse } from '@/types';

// POST /api/registration-invoices/[id]/cancel - Cancel registration invoice
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<RegistrationInvoice>>> {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required', status: 400 },
        { status: 400 }
      );
    }

    try {
      // Check if invoice exists
      const existingInvoice = await db
        .select()
        .from(registrationInvoices)
        .where(eq(registrationInvoices.id, id))
        .limit(1);

      if (!existingInvoice.length) {
        return NextResponse.json(
          { error: 'Invoice not found', status: 404 },
          { status: 404 }
        );
      }

      // Check if invoice is already cancelled
      if (existingInvoice[0].status === 'cancelled') {
        return NextResponse.json(
          { error: 'Invoice is already cancelled', status: 400 },
          { status: 400 }
        );
      }

      // Cancel invoice in Razorpay
      await razorpay.invoices.cancel(id);

      // Update invoice status in database
      const [invoice] = await db
        .update(registrationInvoices)
        .set({
          status: 'cancelled',
          cancelledAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(registrationInvoices.id, id))
        .returning();

      return NextResponse.json({
        data: invoice,
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay cancellation error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error cancelling invoice:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 