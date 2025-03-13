import { NextResponse } from 'next/server';
import { db, customers } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { ApiResponse } from '@/types';

// DELETE /api/tokens/[customerId]/[tokenId] - Delete a token
export async function DELETE(
  request: Request,
  { params }: { params: { customerId: string; tokenId: string } }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { customerId, tokenId } = params;
    
    if (!customerId || !tokenId) {
      return NextResponse.json(
        { error: 'Customer ID and Token ID are required', status: 400 },
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
      // Delete token in Razorpay
      const result = await razorpay.customers.deleteToken(customerId, tokenId);
      
      return NextResponse.json({
        data: { deleted: result.deleted },
        status: 200
      });
    } catch (razorpayError: any) {
      console.error('Razorpay token deletion error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 