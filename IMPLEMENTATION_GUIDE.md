# Razorpay Integration Implementation Guide

This guide provides step-by-step instructions for implementing and using the Razorpay payment integration in your Next.js application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Basic Implementation Flow](#basic-implementation-flow)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Prerequisites

Before you begin, ensure you have the following:

- A Razorpay account with API keys
- Node.js 18.x or later
- PostgreSQL database
- Basic knowledge of Next.js and TypeScript

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/razorpay-payments.git
cd razorpay-payments
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables by creating a `.env` file in the root directory:
```
# Database
DATABASE_URL=postgres://user:password@localhost:5432/razorpay_payments

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

## Configuration

### Database Configuration

The application uses Drizzle ORM with PostgreSQL. The database schema is defined in `db/schema.ts`.

### Razorpay Configuration

The Razorpay client is initialized in `lib/razorpay.ts`. Make sure your API keys are correctly set in the environment variables.

### Webhook Configuration

To receive webhook events from Razorpay:

1. Log in to your Razorpay Dashboard
2. Go to Settings > Webhooks
3. Add a new webhook with the URL: `https://your-domain.com/api/webhooks/razorpay`
4. Set the webhook secret and add it to your environment variables
5. Select the events you want to receive (payment.authorized, payment.failed, etc.)

## Basic Implementation Flow

### 1. Create a Customer

First, create a customer in Razorpay:

```typescript
// Example: Creating a customer
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    contact: '9876543210',
  }),
});

const { data: customer } = await response.json();
```

### 2. Create an Order

Next, create an order for the customer:

```typescript
// Example: Creating an order
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: customer.id,
    amount: 1000, // ₹10.00
    currency: 'INR',
    receipt: 'order_receipt_1',
  }),
});

const { data: order } = await response.json();
```

### 3. Initialize Razorpay Checkout

Use the Razorpay Checkout SDK to collect payment information:

```typescript
// Example: Initializing Razorpay Checkout
const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  name: 'Your Company Name',
  description: 'Purchase Description',
  order_id: order.id,
  handler: function(response) {
    // Handle the payment success
    verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
  },
  prefill: {
    name: customer.name,
    email: customer.email,
    contact: customer.contact,
  },
  theme: {
    color: '#3399cc',
  },
};

const razorpayInstance = new window.Razorpay(options);
razorpayInstance.open();
```

### 4. Verify Payment

After the payment is completed, verify the signature:

```typescript
// Example: Verifying payment
async function verifyPayment(orderId, paymentId, signature) {
  const response = await fetch('/api/payments', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      paymentId,
      signature,
    }),
  });

  const { data: payment } = await response.json();
  
  if (payment.status === 'authorized') {
    // Payment is authorized, you can now capture it
    capturePayment(paymentId);
  }
}
```

### 5. Capture Payment

For payments that require manual capture:

```typescript
// Example: Capturing payment
async function capturePayment(paymentId) {
  const response = await fetch('/api/payments/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentId,
    }),
  });

  const { data: payment } = await response.json();
  
  if (payment.status === 'captured') {
    // Payment is captured, show success message
    showSuccessMessage();
    
    // You can access detailed capture information
    const captureDetails = {
      captureId: payment.captureId,
      capturedAmount: payment.capturedAmount,
      capturedAt: payment.capturedAt,
      captureMethod: payment.captureMethod,
      captureFee: payment.captureFee,
      captureReference: payment.captureReference
    };
    
    console.log('Capture details:', captureDetails);
  }
}
```

## Advanced Features

### Recurring Payments

To implement recurring payments:

1. Create a customer
2. Create an order
3. Collect the first payment using Razorpay Checkout
4. Store the token received after the first payment
5. Use the token for subsequent payments

```typescript
// Example: Creating a recurring payment
const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: customer.email,
    contact: customer.contact,
    amount: 1000,
    orderId: order.id,
    customerId: customer.id,
    token: token.id,
    recurring: '1',
    description: 'Monthly subscription',
  }),
});

const { data: payment } = await response.json();
```

### Registration Invoices

To create a registration invoice (registration link):

```typescript
// Example: Creating a registration invoice
const response = await fetch('/api/registration-invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: customer.id,
    amount: 1000,
    description: 'Registration fee',
  }),
});

const { data: invoice } = await response.json();

// Share the invoice.shortUrl with the customer
```

### Refunding Payments

To refund a payment:

```typescript
// Example: Refunding a payment
const response = await fetch('/api/payments/refund', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    paymentId: payment.providerPaymentId,
    amount: 1000, // Full refund
    notes: {
      reason: 'Customer requested refund',
    },
  }),
});

const { data: refundedPayment } = await response.json();
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your Razorpay API keys are correctly set in the environment variables
   - Check if the keys are for the correct environment (test/live)

2. **Webhook Issues**
   - Verify the webhook URL is accessible from the internet
   - Check if the webhook secret is correctly set
   - Look for webhook delivery failures in the Razorpay Dashboard

3. **Payment Failures**
   - Check the error code and description in the payment response
   - Refer to the Razorpay documentation for specific error codes

### Debugging

1. Enable verbose logging in your application
2. Check the server logs for API request/response details
3. Use the Razorpay Dashboard to track payment status and webhook deliveries

## Best Practices

1. **Security**
   - Never expose your Razorpay API secret key in client-side code
   - Always verify payment signatures on the server
   - Implement proper authentication for your API endpoints

2. **Error Handling**
   - Implement comprehensive error handling for all API calls
   - Provide clear error messages to users
   - Log detailed error information for debugging

3. **Testing**
   - Use Razorpay's test mode for development and testing
   - Test all payment flows, including edge cases
   - Simulate webhook events for testing webhook handlers

4. **Performance**
   - Optimize database queries
   - Implement caching where appropriate
   - Use connection pooling for database connections

5. **Monitoring**
   - Set up monitoring for your application
   - Monitor webhook delivery failures
   - Track payment success/failure rates

## Conclusion

This implementation guide provides a foundation for integrating Razorpay payments into your Next.js application. For more detailed information, refer to the [API Documentation](./DOCUMENTATION.md) and the [Razorpay API Documentation](https://razorpay.com/docs/api/). 