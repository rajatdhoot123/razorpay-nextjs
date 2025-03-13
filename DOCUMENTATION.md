# Razorpay Payment Integration API Documentation

This document provides detailed information about the API endpoints available in the Razorpay payment integration system. The API is built using Next.js and integrates with Razorpay for payment processing.

## Table of Contents

1. [Introduction](#introduction)
2. [API Response Format](#api-response-format)
3. [Authentication](#authentication)
4. [Customer Management](#customer-management)
5. [Order Management](#order-management)
6. [Payment Management](#payment-management)
7. [Token Management](#token-management)
8. [Registration Invoice Management](#registration-invoice-management)
9. [Webhook Integration](#webhook-integration)
10. [Error Handling](#error-handling)
11. [Utility Functions](#utility-functions)

## Introduction

The Razorpay Payment Integration API provides a set of endpoints to manage customers, orders, payments, tokens, and registration invoices. It is built using Next.js and uses Drizzle ORM for database operations.

## API Response Format

All API responses follow a consistent format:

```json
{
  "data": {}, // Response data (if successful)
  "error": "Error message", // Error message (if an error occurred)
  "status": 200 // HTTP status code
}
```

## Authentication

The API does not implement authentication directly. It is recommended to implement an authentication middleware to secure the API endpoints.

## Customer Management

### List All Customers

Retrieves a list of all customers.

- **URL**: `/api/customers`
- **Method**: `GET`
- **Response**: Array of customer objects

### Create a Customer

Creates a new customer in both Razorpay and the local database.

- **URL**: `/api/customers`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "contact": "9876543210",
    "gstin": "22AAAAA0000A1Z5", // Optional
    "notes": {} // Optional
  }
  ```
- **Response**: Created customer object

## Order Management

### List All Orders

Retrieves a list of all orders.

- **URL**: `/api/orders`
- **Method**: `GET`
- **Response**: Array of order objects

### Create an Order

Creates a new order in both Razorpay and the local database.

- **URL**: `/api/orders`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "customerId": "cust_1234567890",
    "amount": 1000, // Amount in smallest currency unit (e.g., paise)
    "currency": "INR", // Optional, defaults to INR
    "receipt": "Receipt No. 1", // Optional
    "notes": {}, // Optional
    "notification": { // Optional, for recurring payments
      "token_id": "token_1234567890",
      "payment_after": 1634057114
    },
    "payment_capture": true // Optional, defaults to true
  }
  ```
- **Response**: Created order object

## Payment Management

### List All Payments

Retrieves a list of all payments.

- **URL**: `/api/payments`
- **Method**: `GET`
- **Response**: Array of payment objects

### Create a Recurring Payment

Creates a recurring payment using a token.

- **URL**: `/api/payments`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "contact": "9876543210",
    "amount": 1000,
    "currency": "INR", // Optional, defaults to INR
    "orderId": "order_1234567890",
    "customerId": "cust_1234567890",
    "token": "token_1234567890",
    "recurring": "1", // Optional, defaults to "1"
    "description": "Monthly subscription", // Optional
    "notes": {} // Optional
  }
  ```
- **Response**: Created payment object

### Verify Payment Signature

Verifies the signature of a payment.

- **URL**: `/api/payments`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "orderId": "order_1234567890",
    "paymentId": "pay_1234567890",
    "signature": "signature_string"
  }
  ```
- **Response**: Updated payment object

### Payment Object Structure

```json
{
  "id": "pay_123456789",
  "orderId": "order_123456789",
  "customerId": "cust_123456789",
  "amount": 100000,
  "currency": "INR",
  "status": "captured",
  "provider": "razorpay",
  "providerPaymentId": "pay_123456789",
  "recurring": "1",
  "razorpaySignature": "signature_string",
  
  // Capture-specific fields
  "captureId": "pay_123456789",
  "capturedAmount": 100000,
  "capturedAt": "2023-10-15T10:30:00Z",
  "captureMethod": "automatic",
  "captureFee": 2000,
  "captureReference": "txn_123456789",
  
  "metadata": {
    "capture": {
      // Full Razorpay capture response
    }
  },
  "createdAt": "2023-10-15T10:00:00Z",
  "updatedAt": "2023-10-15T10:30:00Z"
}
```

### Capture a Payment

**Endpoint:** `POST /api/payments/capture`

**Request Body:**
```json
{
  "paymentId": "pay_123456789",
  "amount": 100000  // Optional, defaults to the full payment amount
}
```

**Response:**
```json
{
  "data": {
    "id": "pay_123456789",
    "orderId": "order_123456789",
    "customerId": "cust_123456789",
    "amount": 100000,
    "currency": "INR",
    "status": "captured",
    "provider": "razorpay",
    "providerPaymentId": "pay_123456789",
    
    // Capture-specific fields
    "captureId": "pay_123456789",
    "capturedAmount": 100000,
    "capturedAt": "2023-10-15T10:30:00Z",
    "captureMethod": "manual",
    "captureFee": 2000,
    "captureReference": "txn_123456789",
    
    "metadata": {
      "capture": {
        // Full Razorpay capture response
      }
    }
  },
  "status": 200
}
```

### Refund Payment

Refunds a captured payment.

- **URL**: `/api/payments/refund`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "paymentId": "pay_1234567890",
    "amount": 1000, // Optional, defaults to the full amount
    "notes": {}, // Optional
    "speed": "normal" // Optional, defaults to "normal"
  }
  ```
- **Response**: Updated payment object

## Token Management

### List Customer Tokens

Retrieves all tokens associated with a customer.

- **URL**: `/api/tokens?customerId=cust_1234567890`
- **Method**: `GET`
- **Query Parameters**:
  - `customerId`: ID of the customer
- **Response**: Array of token objects

### Delete Token

Deletes a token associated with a customer.

- **URL**: `/api/tokens/[customerId]/[tokenId]`
- **Method**: `DELETE`
- **URL Parameters**:
  - `customerId`: ID of the customer
  - `tokenId`: ID of the token
- **Response**: 
  ```json
  {
    "data": {
      "deleted": true
    },
    "status": 200
  }
  ```

## Registration Invoice Management

### List All Registration Invoices

Retrieves a list of all registration invoices.

- **URL**: `/api/registration-invoices`
- **Method**: `GET`
- **Response**: Array of registration invoice objects

### Create a Registration Invoice

Creates a new registration invoice (registration link).

- **URL**: `/api/registration-invoices`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "customerId": "cust_1234567890",
    "customerDetails": {}, // Optional
    "amount": 1000,
    "currency": "INR", // Optional, defaults to INR
    "description": "Registration fee", // Optional
    "receipt": "Receipt No. 1", // Optional
    "notes": {}, // Optional
    "smsStatus": "pending", // Optional, defaults to "pending"
    "emailStatus": "pending" // Optional, defaults to "pending"
  }
  ```
- **Response**: Created registration invoice object

### Resend Registration Invoice Notification

Resends a notification for a registration invoice.

- **URL**: `/api/registration-invoices/[id]/notify`
- **Method**: `POST`
- **URL Parameters**:
  - `id`: ID of the registration invoice
- **Request Body**:
  ```json
  {
    "medium": "sms" // or "email"
  }
  ```
- **Response**: Updated registration invoice object

### Cancel Registration Invoice

Cancels a registration invoice.

- **URL**: `/api/registration-invoices/[id]/cancel`
- **Method**: `POST`
- **URL Parameters**:
  - `id`: ID of the registration invoice
- **Response**: Updated registration invoice object

## Webhook Integration

### Razorpay Webhook Handler

Handles webhook events from Razorpay.

- **URL**: `/api/webhooks/razorpay`
- **Method**: `POST`
- **Headers**:
  - `x-razorpay-signature`: Signature from Razorpay
- **Request Body**: Webhook payload from Razorpay
- **Response**: Acknowledgement of receipt

#### Supported Webhook Events

##### Payment Events
- `payment.authorized`: When a payment is authorized
- `payment.failed`: When a payment fails
- `payment.captured`: When a payment is captured
- `order.paid`: When an order is paid

##### Invoice Events
- `invoice.paid`: When an invoice is paid
- `invoice.expired`: When an invoice expires

##### Token Events for Recurring Payments
- `token.confirmed`: When a token (mandate) is confirmed by the bank
- `token.rejected`: When a token is rejected
- `token.cancelled`: When a token is cancelled
- `token.paused`: When a token is paused (UPI only)

##### Notification Events
- `order.notification.delivered`: When a pre-debit notification is successfully delivered
- `order.notification.failed`: When a pre-debit notification fails to deliver

### Webhook Signature Validation

All webhooks from Razorpay include a signature in the `x-razorpay-signature` header. This signature should be validated to ensure the webhook is genuinely from Razorpay.

```javascript
// Webhook signature validation example
const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  
  return expectedSignature === signature;
}
```

### Webhook Idempotency

Razorpay may send the same webhook event multiple times to ensure delivery. To handle duplicate webhook events:

1. Check the `x-razorpay-event-id` header in the webhook request
2. Store processed event IDs to detect duplicates
3. Implement idempotent event handlers that can safely process the same event multiple times

## Error Handling

The API uses a consistent error handling approach:

- **400 Bad Request**: Invalid input parameters
- **401 Unauthorized**: Authentication failure
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Razorpay API errors
- **500 Internal Server Error**: Server-side errors

All error responses include an error message and a status code.

## Utility Functions

The API includes several utility functions to help with common tasks:

- **formatAmount**: Formats an amount from the smallest currency unit to a readable format
- **generateReceiptId**: Generates a unique receipt ID for orders
- **formatTimestamp**: Formats a Unix timestamp to a readable date string
- **isValidEmail**: Validates an email address
- **isValidPhone**: Validates a phone number (Indian format)
- **isValidGSTIN**: Validates a GSTIN (Indian GST Identification Number)
- **truncateString**: Truncates a string to a specified length

## Database Schema

The application uses Drizzle ORM with PostgreSQL and includes the following tables:

- **customers**: Stores customer information
- **orders**: Records payment orders
- **payments**: Captures payment responses
- **registration_invoices**: Manages registration links

### Payments Table

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key |
| order_id | text | Foreign key to orders table |
| customer_id | text | Foreign key to customers table |
| amount | integer | Payment amount in smallest currency unit |
| currency | text | Currency code (default: INR) |
| status | text | Payment status (e.g., PENDING, AUTHORIZED, CAPTURED, FAILED) |
| provider | text | Payment provider (e.g., razorpay) |
| provider_payment_id | text | ID from the payment provider |
| recurring | text | Recurring payment flag (e.g., "1" or "preferred") |
| razorpay_signature | text | Signature for payment verification |
| capture_id | text | ID of the capture transaction |
| captured_amount | integer | Amount that was captured |
| captured_at | timestamp | When the payment was captured |
| capture_method | text | How the payment was captured (e.g., automatic, manual) |
| capture_fee | integer | Fee charged for the capture |
| capture_reference | text | Reference ID for the capture transaction |
| metadata | json | Additional payment data |
| created_at | timestamp | Record creation timestamp |
| updated_at | timestamp | Record update timestamp |

## Environment Variables

The following environment variables are required:

- **DATABASE_URL**: PostgreSQL connection string
- **RAZORPAY_KEY_ID**: Razorpay API key ID
- **RAZORPAY_KEY_SECRET**: Razorpay API key secret
- **RAZORPAY_WEBHOOK_SECRET**: Secret for verifying Razorpay webhooks

## Conclusion

This API provides a comprehensive set of endpoints for integrating with Razorpay for payment processing. It handles customer management, order creation, payment processing, token management, and registration invoice management.

For more information about Razorpay's API, refer to the [Razorpay API Documentation](https://razorpay.com/docs/api/). 