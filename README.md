# Razorpay Payments Integration

> **Note**: This repository was generated with the assistance of AI.

This is a Next.js application that integrates with Razorpay for handling payments, including customer management, order creation, payment processing, and registration invoice management.

## Features

- Customer Management
- Order Creation
- Payment Processing
- Registration Invoice Management (for recurring payments)
- Webhook Integration for Payment, Token, and Notification Events
- Signature Verification
- Database Integration with Drizzle ORM

## Prerequisites

- Node.js 18.x or later
- PostgreSQL database
- Razorpay account with API keys

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/razorpay_payments

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

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

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create a new customer

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create a new order

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create a recurring payment
- `PATCH /api/payments` - Verify payment signature

### Registration Invoices
- `GET /api/registration-invoices` - List all registration invoices
- `POST /api/registration-invoices` - Create a registration invoice
- `PATCH /api/registration-invoices/[id]/notify` - Resend notifications
- `DELETE /api/registration-invoices/[id]/cancel` - Cancel registration invoice

### Tokens (for Recurring Payments)
- `GET /api/tokens?customerId=cust_123` - Get tokens for a customer
- `DELETE /api/tokens/[customerId]/[tokenId]` - Delete a token 

### Webhooks
- `POST /api/webhooks/razorpay` - Webhook handler for Razorpay events

## Setting Up Razorpay Webhooks

To set up webhooks for recurring payments:

1. Log in to your Razorpay Dashboard and navigate to **Settings** > **Webhooks**
2. Click **Add New Webhook**
3. Enter your webhook URL (e.g., `https://yourdomain.com/api/webhooks/razorpay`)
4. Set a Secret for signature verification (store this in your `.env` file as `RAZORPAY_WEBHOOK_SECRET`)
5. Add your alert email address to receive webhook failure notifications
6. Select the webhook events you want to subscribe to:
   - For recurring payments, make sure to select:
     - `payment.authorized`
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `token.confirmed`
     - `token.rejected` 
     - `token.cancelled`
     - `token.paused`
     - `invoice.paid`
     - `invoice.expired`
     - `order.notification.delivered`
     - `order.notification.failed`
7. Click **Create Webhook**

> **Note**: Only port numbers 80 and 443 are allowed in webhook URLs.

### Webhook Testing

For testing webhooks locally:
1. Use a tool like [ngrok](https://ngrok.com/) to create a tunnel to your local server
2. Set up a test webhook in your Razorpay Dashboard's test mode, pointing to your ngrok URL

## Database Schema

The application uses Drizzle ORM with PostgreSQL and includes the following tables:

- `customers` - Stores customer information
- `orders` - Records payment orders
- `payments` - Captures payment responses
- `registration_invoices` - Manages registration links

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support with Razorpay integration, please refer to the [Razorpay Documentation](https://razorpay.com/docs/). 