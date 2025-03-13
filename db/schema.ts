import { pgTable, text, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";

// Customers table
export const customers = pgTable("customers", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  contact: text("contact").notNull(),
  gstin: text("gstin"),
  notes: json("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: text("id").primaryKey().notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(), // In smallest currency unit (e.g., paise)
  currency: text("currency").notNull().default("INR"),
  method: text("method"), // e.g., "upi"
  receipt: text("receipt"),
  status: text("status").notNull(), // e.g., "CREATED", "AUTHORIZED", "FAILED"
  attempts: integer("attempts").default(0),
  notes: json("notes"),
  token: json("token"), // JSON field for token details (if any)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: text("id").primaryKey().notNull(),
  orderId: text("order_id").notNull().references(() => orders.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull(), // e.g., "PENDING", "AUTHORIZED", "CAPTURED", "FAILED"
  provider: text("provider").notNull(), // e.g., "razorpay"
  providerPaymentId: text("provider_payment_id"),
  recurring: text("recurring"), // e.g., "1" or "preferred"
  razorpaySignature: text("razorpay_signature"),
  
  // New capture-specific fields
  captureId: text("capture_id"),
  capturedAmount: integer("captured_amount"),
  capturedAt: timestamp("captured_at"),
  captureMethod: text("capture_method"),
  captureFee: integer("capture_fee"),
  captureReference: text("capture_reference"),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Registration Invoices table
export const registrationInvoices = pgTable("registration_invoices", {
  id: text("id").primaryKey().notNull(),
  entity: text("entity").notNull().default("invoice"), // Constant: "invoice"
  receipt: text("receipt"),
  invoiceNumber: text("invoice_number"),
  customerId: text("customer_id").references(() => customers.id),
  customerDetails: json("customer_details"),
  orderId: text("order_id").references(() => orders.id),
  lineItems: json("line_items"),
  paymentId: text("payment_id").references(() => payments.id),
  status: text("status").notNull(), // e.g., "DRAFT", "ISSUED", "PAID", "CANCELLED", etc.
  expireBy: integer("expire_by"),
  issuedAt: integer("issued_at"),
  paidAt: integer("paid_at"),
  cancelledAt: integer("cancelled_at"),
  expiredAt: integer("expired_at"),
  smsStatus: text("sms_status").default("pending"), // "pending" or "sent"
  emailStatus: text("email_status").default("pending"), // "pending" or "sent"
  date: integer("date"),
  terms: text("terms"),
  partialPayment: boolean("partial_payment").default(false),
  amount: integer("amount").notNull(),
  amountPaid: integer("amount_paid").default(0),
  amountDue: integer("amount_due"),
  currency: text("currency").notNull().default("INR"),
  description: text("description"),
  notes: json("notes"),
  shortUrl: text("short_url"),
  type: text("type").notNull().default("invoice"), // Constant: "invoice"
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}); 