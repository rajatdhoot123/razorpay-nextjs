import { NextResponse } from 'next/server';
import { db, registrationInvoices } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { CreateRegistrationInvoiceRequest, RegistrationInvoice, ApiResponse } from '@/types';

// GET /api/registration-invoices - List all registration invoices
export async function GET(): Promise<NextResponse<ApiResponse<RegistrationInvoice[]>>> {
  try {
    const allInvoices = await db.select().from(registrationInvoices);
    return NextResponse.json({
      data: allInvoices,
      status: 200
    });
  } catch (error: any) {
    console.error('Error fetching registration invoices:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// POST /api/registration-invoices - Create a registration invoice
export async function POST(request: Request): Promise<NextResponse<ApiResponse<RegistrationInvoice>>> {
  try {
    const body = await request.json() as CreateRegistrationInvoiceRequest;
    const {
      customerId,
      customerDetails,
      amount,
      currency = 'INR',
      description,
      receipt,
      notes,
      smsStatus = 'pending',
      emailStatus = 'pending',
    } = body;

    // Validate required fields
    if (!customerId || !amount) {
      return NextResponse.json(
        { error: 'Customer ID and amount are required fields', status: 400 },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 (₹1.00)', status: 400 },
        { status: 400 }
      );
    }

    try {
      // Create registration link in Razorpay
      const razorpayInvoice = await razorpay.invoices.create({
        type: 'link',
        amount,
        currency,
        customer: {
          id: customerId,
          ...customerDetails,
        },
        description,
        receipt,
        notes,
        sms_notify: true,
        email_notify: true,
      });

      // Store registration invoice in database
      const [invoice] = await db
        .insert(registrationInvoices)
        .values({
          id: razorpayInvoice.id,
          entity: razorpayInvoice.entity,
          receipt,
          customerId,
          customerDetails,
          amount,
          currency,
          description,
          notes,
          status: razorpayInvoice.status,
          shortUrl: razorpayInvoice.short_url,
          smsStatus,
          emailStatus,
          type: 'invoice',
        })
        .returning();

      return NextResponse.json({
        data: invoice,
        status: 201
      }, { status: 201 });
    } catch (razorpayError: any) {
      console.error('Razorpay invoice creation error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error creating registration invoice:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// POST /api/registration-invoices/[id]/notify - Resend notifications
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { medium } = await request.json(); // 'sms' or 'email'

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

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/registration-invoices/[id]/cancel - Cancel registration invoice
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 