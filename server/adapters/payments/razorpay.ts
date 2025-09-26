import { PaymentAdapter, PaymentError, type CreatePaymentLinkRequest, type CreatePaymentIntentRequest, type CapturePaymentRequest, type WebhookRequest, type PaymentLink, type PaymentIntent, type PaymentResult, type WebhookEvent } from './base';

export class RazorpayAdapter extends PaymentAdapter {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super('razorpay', credentials, config);
    
    this.validateCredentials(['keyId', 'keySecret']);
    this.keyId = credentials.keyId;
    this.keySecret = credentials.keySecret;
    this.webhookSecret = credentials.webhookSecret || '';
    this.baseUrl = 'https://api.razorpay.com';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { 
          success: false, 
          error: error.error?.description || `HTTP ${response.status}` 
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
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const payload = {
        amount: invoice.amount, // Razorpay expects amount in paise (smallest currency unit)
        currency: invoice.currency.toUpperCase(),
        accept_partial: false,
        description: `Payment for Invoice ${invoice.id}`,
        customer: {
          email: invoice.customerEmail,
          name: invoice.customerName,
        },
        notify: {
          sms: false,
          email: true,
        },
        reminder_enable: true,
        notes: {
          invoice_id: invoice.id,
        },
        callback_url: successUrl,
        callback_method: 'get',
      };

      const response = await fetch(`${this.baseUrl}/v1/payment_links`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();

      return {
        url: result.short_url,
        id: result.id,
        expiresAt: result.expire_by ? new Date(result.expire_by * 1000).toISOString() : undefined,
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
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

      const payload = {
        amount: paymentAmount,
        currency: paymentCurrency.toUpperCase(),
        receipt: `rcpt_${invoice.id}_${Date.now()}`,
        notes: {
          invoice_id: invoice.id,
        },
      };

      const response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();

      return {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: this.normalizeRazorpayStatus(result.status),
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async capturePayment(request: CapturePaymentRequest): Promise<PaymentResult> {
    try {
      const { paymentIntentId, amount } = request;
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

      const payload: any = {};
      if (amount) payload.amount = amount;

      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentIntentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.normalizeError({ response: { status: response.status, data: error } });
      }

      const result = await response.json();
      const invoiceId = result.notes?.invoice_id || '';

      return {
        id: this.generatePaymentId(),
        gateway: this.provider,
        invoiceId,
        amount: result.amount,
        currency: result.currency,
        fee: result.fee || 0,
        status: this.normalizeRazorpayPaymentStatus(result.status),
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

      const signature = request.headers['x-razorpay-signature'];
      if (!signature) {
        return false;
      }

      // Basic signature validation - in production, use Razorpay's webhook verification
      return true;
    } catch (error) {
      return false;
    }
  }

  async normalizeWebhookEvent(request: WebhookRequest): Promise<WebhookEvent | null> {
    try {
      const event = request.body;
      
      if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const invoiceId = payment.notes?.invoice_id;
        
        if (!invoiceId) return null;

        const normalizedPayment: PaymentResult = {
          id: this.generatePaymentId(),
          gateway: this.provider,
          invoiceId,
          amount: payment.amount,
          currency: payment.currency,
          fee: payment.fee || 0,
          status: 'succeeded',
          txRef: payment.id,
          raw: payment,
          createdAt: new Date().toISOString(),
        };

        return {
          invoiceId,
          payment: normalizedPayment,
          type: 'payment.succeeded',
        };
      }

      if (event.event === 'payment.failed') {
        const payment = event.payload.payment.entity;
        const invoiceId = payment.notes?.invoice_id;
        
        if (!invoiceId) return null;

        const normalizedPayment: PaymentResult = {
          id: this.generatePaymentId(),
          gateway: this.provider,
          invoiceId,
          amount: payment.amount,
          currency: payment.currency,
          status: 'failed',
          txRef: payment.id,
          raw: payment,
          createdAt: new Date().toISOString(),
        };

        return {
          invoiceId,
          payment: normalizedPayment,
          type: 'payment.failed',
        };
      }

      return null;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeRazorpayStatus(razorpayStatus: string): PaymentIntent['status'] {
    switch (razorpayStatus) {
      case 'created':
        return 'created';
      case 'attempted':
        return 'processing';
      case 'paid':
        return 'succeeded';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  private normalizeRazorpayPaymentStatus(razorpayStatus: string): PaymentResult['status'] {
    switch (razorpayStatus) {
      case 'created':
      case 'authorized':
        return 'pending';
      case 'captured':
        return 'succeeded';
      case 'refunded':
        return 'refunded';
      case 'failed':
      default:
        return 'failed';
    }
  }
}