import { NextResponse } from 'next/server';
import { db, orders } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { CreateOrderRequest, Order, ApiResponse } from '@/types';

// GET /api/orders - List all orders
export async function GET(): Promise<NextResponse<ApiResponse<Order[]>>> {
  try {
    const allOrders = await db.select().from(orders);
    return NextResponse.json({
      data: allOrders,
      status: 200
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Order>>> {
  try {
    const body = await request.json() as CreateOrderRequest;
    const {
      customerId,
      amount,
      currency = 'INR',
      receipt,
      notes,
      notification,
      payment_capture = true,
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
      // Create order in Razorpay
      const razorpayOrder = await razorpay.orders.create({
        amount,
        currency,
        receipt,
        notes,
        payment_capture,
        ...(notification && { notification }),
      });

      // Store order in database
      const [order] = await db
        .insert(orders)
        .values({
          id: razorpayOrder.id,
          customerId,
          amount,
          currency,
          receipt,
          notes,
          status: 'created',
          token: notification?.token_id ? { token_id: notification.token_id } : null,
        })
        .returning();

      return NextResponse.json({
        data: order,
        status: 201
      }, { status: 201 });
    } catch (razorpayError: any) {
      console.error('Razorpay order creation error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 