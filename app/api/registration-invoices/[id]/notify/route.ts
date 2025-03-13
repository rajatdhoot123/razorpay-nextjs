import { NextResponse } from 'next/server';
import { db, registrationInvoices } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { NotifyInvoiceRequest, RegistrationInvoice, ApiResponse } from '@/types';

// POST /api/registration-invoices/[id]/notify - Resend notifications
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

    const body = await request.json() as NotifyInvoiceRequest;
    const { medium } = body; // 'sms' or 'email'

    if (!medium || (medium !== 'sms' && medium !== 'email')) {
      return NextResponse.json(
        { error: 'Valid medium (sms or email) is required', status: 400 },
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

      // Resend notification through Razorpay
      await razorpay.invoices.notifyBy(id, medium);

      // Update notification status in database
      const [invoice] = await db
        .update(registrationInvoices)
        .set({
          ...(medium === 'sms' && { smsStatus: 'sent' }),
          ...(medium === 'email' && { emailStatus: 'sent' }),
        })
        .where(eq(registrationInvoices.id, id))
        .returning();

      return NextResponse.json({
        data: invoice,
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay notification error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 