import { NextResponse } from 'next/server';
import { db, customers } from '@/db';
import { razorpay } from '@/lib/razorpay';
import { eq } from 'drizzle-orm';
import { CreateCustomerRequest, Customer, ApiResponse } from '@/types';

// GET /api/customers - List all customers
export async function GET(): Promise<NextResponse<ApiResponse<Customer[]>>> {
  try {
    const allCustomers = await db.select().from(customers);
    return NextResponse.json({
      data: allCustomers,
      status: 200
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Customer>>> {
  try {
    const body = await request.json() as CreateCustomerRequest;
    const { name, email, contact, gstin, notes } = body;

    // Validate required fields
    if (!name || !email || !contact) {
      return NextResponse.json(
        { error: 'Name, email, and contact are required fields', status: 400 },
        { status: 400 }
      );
    }

    // Create customer in Razorpay
    try {
      const razorpayCustomer = await razorpay.customers.create({
        name,
        email,
        contact,
        gstin,
        notes,
      });

      // Store customer in database
      const [customer] = await db
        .insert(customers)
        .values({
          id: razorpayCustomer.id,
          name,
          email,
          contact,
          gstin,
          notes,
        })
        .returning();

      return NextResponse.json({
        data: customer,
        status: 201
      }, { status: 201 });
    } catch (razorpayError: any) {
      console.error('Razorpay customer creation error:', razorpayError);
      return NextResponse.json(
        { 
          error: `Razorpay error: ${razorpayError.message || 'Unknown error'}`, 
          status: 422 
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: error.message, status: 500 },
      { status: 500 }
    );
  }
} 