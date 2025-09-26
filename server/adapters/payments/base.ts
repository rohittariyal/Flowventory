// Base payment adapter interface for all payment gateway providers
// Normalizes different payment provider APIs to a consistent interface

export interface PaymentLink {
  url: string;                    // Hosted payment page URL
  id?: string;                   // Provider's payment link ID
  expiresAt?: string;           // ISO timestamp when link expires
}

export interface PaymentIntent {
  id: string;                   // Provider's intent/order ID
  clientSecret?: string;        // For client-side completion (Stripe)
  approvalUrl?: string;        // For redirect flows (PayPal)
  amount: number;              // Amount in cents
  currency: string;            // Currency code
  status: 'created' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
}

export interface PaymentResult {
  id: string;                  // Our internal payment ID
  gateway: string;             // Provider name
  invoiceId: string;          // Invoice this payment is for
  amount: number;             // Amount in cents
  currency: string;           // Currency code
  fee?: number;               // Provider fee in cents
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  txRef?: string;             // Provider transaction reference
  raw: any;                   // Raw provider response
  createdAt: string;          // ISO timestamp
}

export interface WebhookEvent {
  invoiceId: string;          // Invoice this event affects
  payment: PaymentResult;     // Normalized payment data
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
}

export interface Invoice {
  id: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  amount: number;             // Total amount in cents
  currency: string;
  status: 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;           // ISO date
  description?: string;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;        // In cents
    amount: number;          // In cents
  }[];
}

// Request interfaces
export interface CreatePaymentLinkRequest {
  invoice: Invoice;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentIntentRequest {
  invoice: Invoice;
  amount?: number;            // Override invoice amount (for partial payments)
  currency?: string;          // Override invoice currency
  captureMethod?: 'automatic' | 'manual';
}

export interface CapturePaymentRequest {
  paymentIntentId: string;
  amount?: number;            // For partial capture
}

export interface WebhookRequest {
  headers: Record<string, string>;
  body: any;
  rawBody: Buffer | string;
}

// Error types for consistent error handling
export class PaymentError extends Error {
  public readonly code: string;
  public readonly provider: string;
  public readonly details?: any;

  constructor(code: string, message: string, provider: string, details?: any) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.provider = provider;
    this.details = details;
  }
}

// Base adapter class that all payment providers extend
export abstract class PaymentAdapter {
  protected provider: string;
  protected credentials: Record<string, any>;
  protected config: Record<string, any>;
  protected testMode: boolean;

  constructor(provider: string, credentials: Record<string, any>, config: Record<string, any> = {}) {
    this.provider = provider;
    this.credentials = credentials;
    this.config = config;
    this.testMode = config.testMode || false;
  }

  /**
   * Test the connection/credentials with the provider
   */
  abstract testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Create a hosted payment link for an invoice
   */
  abstract createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLink>;

  /**
   * Create a payment intent for checkout flows
   */
  abstract createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent>;

  /**
   * Capture a payment (for manual capture flows)
   */
  abstract capturePayment(request: CapturePaymentRequest): Promise<PaymentResult>;

  /**
   * Verify webhook signature and authenticate the request
   */
  abstract verifyWebhookSignature(request: WebhookRequest): Promise<boolean>;

  /**
   * Parse webhook payload and normalize to our event format
   */
  abstract normalizeWebhookEvent(request: WebhookRequest): Promise<WebhookEvent | null>;

  // Helper methods for consistent error handling
  protected throwError(code: string, message: string, details?: any): never {
    throw new PaymentError(code, message, this.provider, details);
  }

  protected normalizeError(error: any): PaymentError {
    if (error instanceof PaymentError) {
      return error;
    }
    
    // Map common HTTP errors to our error codes
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return new PaymentError('AUTH_ERROR', 'Authentication failed', this.provider, error.response.data);
      } else if (status === 400) {
        return new PaymentError('VALIDATION_ERROR', 'Invalid request data', this.provider, error.response.data);
      } else if (status >= 500) {
        return new PaymentError('PROVIDER_ERROR', 'Payment provider service unavailable', this.provider, error.response.data);
      }
    }
    
    return new PaymentError('UNKNOWN_ERROR', error.message || 'Unknown payment error occurred', this.provider, error);
  }

  // Helper to validate required credentials
  protected validateCredentials(required: string[]): void {
    const missing = required.filter(key => !this.credentials[key]);
    if (missing.length > 0) {
      this.throwError('CONFIG_ERROR', `Missing required credentials: ${missing.join(', ')}`);
    }
  }

  // Helper to convert amount between currencies (basic implementation)
  protected convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
    // For now, just return the same amount - implement currency conversion later
    if (fromCurrency === toCurrency) return amount;
    throw new PaymentError('CURRENCY_ERROR', `Currency conversion from ${fromCurrency} to ${toCurrency} not supported`, this.provider);
  }

  // Helper to format amount in provider's expected format
  protected formatAmount(amount: number, currency: string): number {
    // Most providers expect amounts in cents/smallest currency unit
    return Math.round(amount);
  }

  // Helper to generate internal payment ID
  protected generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}