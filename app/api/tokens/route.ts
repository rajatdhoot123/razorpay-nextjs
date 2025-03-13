import { NextResponse } from 'next/server';
import { db, customers } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { ApiResponse } from '@/types';

// GET /api/tokens?customerId=cust_123 - Get tokens for a customer
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required', status: 400 },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existingCustomer.length) {
      return NextResponse.json(
        { error: 'Customer not found', status: 404 },
        { status: 404 }
      );
    }

    try {
      // Fetch tokens from Razorpay
      const tokens = await razorpay.customers.fetchTokens(customerId);
      
      return NextResponse.json({
        data: tokens,
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay token fetch error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 