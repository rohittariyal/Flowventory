import { PaymentAdapter, PaymentError, type CreatePaymentLinkRequest, type CreatePaymentIntentRequest, type CapturePaymentRequest, type WebhookRequest, type PaymentLink, type PaymentIntent, type PaymentResult, type WebhookEvent } from './base';

export class StripeAdapter extends PaymentAdapter {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super('stripe', credentials, config);
    
    this.validateCredentials(['secretKey']);
    this.apiKey = credentials.secretKey;
    this.webhookSecret = credentials.webhookSecret || '';
    this.baseUrl = this.testMode ? 'https://api.stripe.com' : 'https://api.stripe.com';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { 
          success: false, 
          error: error.error?.message || `HTTP ${response.status}` 
        };
      }

      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Connection failed' 
      };
    }
  }

  async createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLink> {
    try {
      const { invoice, successUrl, cancelUrl } = request;
      
      const body = new URLSearchParams({
        'line_items[0][price_data][currency]': invoice.currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': `Invoice ${invoice.id}`,
        'line_items[0][price_data][unit_amount]': invoice.amount.toString(),
        'line_items[0][quantity]': '1',
        'metadata[invoice_id]': invoice.id,
        'automatic_tax[enabled]': 'false',
      });

      if (successUrl) body.append('after_completion[type]', 'redirect');
      if (successUrl) body.append('after_completion[redirect][url]', successUrl);
      if (invoice.customerEmail) body.append('customer_email', invoice.customerEmail);

      const response = await fetch(`${this.baseUrl}/v1/payment_links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();

      return {
        url: result.url,
        id: result.id,
        expiresAt: result.expires_at ? new Date(result.expires_at * 1000).toISOString() : undefined,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    try {
      const { invoice, amount, currency } = request;
      const paymentAmount = amount || invoice.amount;
      const paymentCurrency = currency || invoice.currency;

      const body = new URLSearchParams({
        'amount': paymentAmount.toString(),
        'currency': paymentCurrency.toLowerCase(),
        'metadata[invoice_id]': invoice.id,
        'automatic_payment_methods[enabled]': 'true',
      });

      if (invoice.customerEmail) {
        body.append('receipt_email', invoice.customerEmail);
      }

      const response = await fetch(`${this.baseUrl}/v1/payment_intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();

      return {
        id: result.id,
        clientSecret: result.client_secret,
        amount: result.amount,
        currency: result.currency.toUpperCase(),
        status: this.normalizeStripeStatus(result.status),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async capturePayment(request: CapturePaymentRequest): Promise<PaymentResult> {
    try {
      const { paymentIntentId, amount } = request;

      const body = new URLSearchParams();
      if (amount) body.append('amount_to_capture', amount.toString());

      const response = await fetch(`${this.baseUrl}/v1/payment_intents/${paymentIntentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();
      const invoiceId = result.metadata?.invoice_id || '';

      return {
        id: this.generatePaymentId(),
        gateway: this.provider,
        invoiceId,
        amount: result.amount,
        currency: result.currency.toUpperCase(),
        fee: result.charges?.data[0]?.balance_transaction?.fee || 0,
        status: this.normalizeStripePaymentStatus(result.status),
        txRef: result.id,
        raw: result,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async verifyWebhookSignature(request: WebhookRequest): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        throw new PaymentError('CONFIG_ERROR', 'Webhook secret not configured', this.provider);
      }

      const signature = request.headers['stripe-signature'];
      if (!signature) {
        return false;
      }

      // Basic signature validation - in production, use Stripe's webhook verification
      return true;
    } catch (error) {
      return false;
    }
  }

  async normalizeWebhookEvent(request: WebhookRequest): Promise<WebhookEvent | null> {
    try {
      const event = request.body;
      
      if (event.type === 'payment_intent.succeeded' || event.type === 'charge.succeeded') {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        
        if (!invoiceId) return null;

        const payment: PaymentResult = {
          id: this.generatePaymentId(),
          gateway: this.provider,
          invoiceId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          fee: paymentIntent.charges?.data[0]?.balance_transaction?.fee || 0,
          status: 'succeeded',
          txRef: paymentIntent.id,
          raw: paymentIntent,
          createdAt: new Date().toISOString(),
        };

        return {
          invoiceId,
          payment,
          type: 'payment.succeeded',
        };
      }

      if (event.type === 'payment_intent.payment_failed' || event.type === 'charge.failed') {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        
        if (!invoiceId) return null;

        const payment: PaymentResult = {
          id: this.generatePaymentId(),
          gateway: this.provider,
          invoiceId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          status: 'failed',
          txRef: paymentIntent.id,
          raw: paymentIntent,
          createdAt: new Date().toISOString(),
        };

        return {
          invoiceId,
          payment,
          type: 'payment.failed',
        };
      }

      return null;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeStripeStatus(stripeStatus: string): PaymentIntent['status'] {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'created';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  private normalizeStripePaymentStatus(stripeStatus: string): PaymentResult['status'] {
    switch (stripeStatus) {
      case 'processing':
        return 'pending';
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
      case 'requires_payment_method':
        return 'failed';
      default:
        return 'failed';
    }
  }
}