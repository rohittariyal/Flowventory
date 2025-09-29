import crypto from 'crypto';

// HMAC-SHA256 signing for webhook payloads
export function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// Verify webhook signature
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.startsWith('sha256=') 
      ? signature.substring(7) 
      : signature;
    
    const expectedSignature = signPayload(payload, secret);
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Generate webhook secret
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create signature header value
export function createSignatureHeader(payload: string, secret: string): string {
  const signature = signPayload(payload, secret);
  return `sha256=${signature}`;
}

// Webhook signature middleware for incoming webhooks
export function verifyWebhookSignature(secret: string) {
  return (req: any, res: any, next: any) => {
    try {
      const signature = req.headers['x-flowventory-signature'] || req.headers['x-signature'];
      
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature header' });
      }
      
      const payload = JSON.stringify(req.body);
      
      if (!verifySignature(payload, signature, secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      next();
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      res.status(500).json({ error: 'Signature verification failed' });
    }
  };
}