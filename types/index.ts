// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  contact: string;
  gstin?: string;
  notes?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  contact: string;
  gstin?: string;
  notes?: Record<string, any>;
}

// Order Types
export interface Order {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  method?: string;
  receipt?: string;
  status: string;
  attempts?: number;
  notes?: Record<string, any>;
  token?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrderRequest {
  customerId: string;
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
  notification?: {
    token_id?: string;
    payment_after?: number;
  };
  payment_capture?: boolean;
}

// Payment Types
export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId?: string;
  recurring?: string;
  razorpaySignature?: string;
  
  // New capture-specific fields
  captureId?: string;
  capturedAmount?: number;
  capturedAt?: Date;
  captureMethod?: string;
  captureFee?: number;
  captureReference?: string;
  
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePaymentRequest {
  email: string;
  contact: string;
  amount: number;
  currency?: string;
  orderId: string;
  customerId: string;
  token: string;
  recurring?: string;
  description?: string;
  notes?: Record<string, any>;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

// Registration Invoice Types
export interface RegistrationInvoice {
  id: string;
  entity: string;
  receipt?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerDetails?: Record<string, any>;
  orderId?: string;
  lineItems?: any;
  paymentId?: string;
  status: string;
  expireBy?: number;
  issuedAt?: number;
  paidAt?: number;
  cancelledAt?: number;
  expiredAt?: number;
  smsStatus?: string;
  emailStatus?: string;
  date?: number;
  terms?: string;
  partialPayment?: boolean;
  amount: number;
  amountPaid?: number;
  amountDue?: number;
  currency: string;
  description?: string;
  notes?: Record<string, any>;
  shortUrl?: string;
  type: string;
  comment?: string;
  createdAt?: Date;
}

export interface CreateRegistrationInvoiceRequest {
  customerId: string;
  customerDetails?: Record<string, any>;
  amount: number;
  currency?: string;
  description?: string;
  receipt?: string;
  notes?: Record<string, any>;
  smsStatus?: string;
  emailStatus?: string;
}

export interface NotifyInvoiceRequest {
  medium: 'sms' | 'email';
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Razorpay Types
export interface RazorpayCustomer {
  id: string;
  entity: string;
  name: string;
  email: string;
  contact: string;
  gstin?: string;
  notes?: Record<string, any>;
  created_at: number;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: string;
  attempts: number;
  notes?: Record<string, any>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id?: string;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status?: string;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  customer_id?: string;
  token_id?: string;
  notes?: Record<string, any>;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  created_at: number;
}

export interface RazorpayInvoice {
  id: string;
  entity: string;
  receipt?: string;
  invoice_number?: string;
  customer_id?: string;
  customer_details?: Record<string, any>;
  order_id?: string;
  line_items?: any;
  payment_id?: string;
  status: string;
  expire_by?: number;
  issued_at?: number;
  paid_at?: number;
  cancelled_at?: number;
  expired_at?: number;
  sms_status?: string;
  email_status?: string;
  date?: number;
  terms?: string;
  partial_payment?: boolean;
  amount: number;
  amount_paid?: number;
  amount_due?: number;
  currency: string;
  description?: string;
  notes?: Record<string, any>;
  short_url?: string;
  type: string;
  created_at: number;
} 