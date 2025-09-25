import { 
  ShippingAdapter, 
  ShippingRate, 
  ShipmentResult, 
  TrackingResult, 
  RateRequest, 
  CreateShipmentRequest, 
  TrackingRequest, 
  CancelShipmentRequest 
} from './base';

interface UPSCredentials {
  accessKey?: string;
  username?: string;
  password?: string;
  accountNumber?: string;
  clientId?: string;      // For OAuth 2.0
  clientSecret?: string;  // For OAuth 2.0
}

export class UPSAdapter extends ShippingAdapter {
  private baseUrl: string;

  constructor(credentials: UPSCredentials, config: Record<string, any> = {}) {
    super('ups', credentials, config);
    this.baseUrl = config.baseUrl || process.env.UPS_BASE_URL || 'https://wwwcie.ups.com/api'; // CIE is test environment
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.hasValidCredentials()) {
      return { 
        success: false, 
        error: 'UPS connector not configured. Please add your UPS API credentials in Settings → Shipping Integrations.' 
      };
    }

    // TODO: Implement actual UPS API test
    return { 
      success: false, 
      error: 'UPS integration is not yet implemented. Coming soon!' 
    };
  }

  async getRates(request: RateRequest): Promise<ShippingRate[]> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'UPS connector not configured. Please add your UPS API credentials.');
    }

    // TODO: Implement UPS Rating API
    this.throwError('NOT_IMPLEMENTED', 'UPS rate shopping is not yet implemented. Coming soon!');
  }

  async createShipment(request: CreateShipmentRequest): Promise<ShipmentResult> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'UPS connector not configured. Please add your UPS API credentials.');
    }

    // TODO: Implement UPS Ship API
    this.throwError('NOT_IMPLEMENTED', 'UPS shipment creation is not yet implemented. Coming soon!');
  }

  async getTracking(request: TrackingRequest): Promise<TrackingResult> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'UPS connector not configured. Please add your UPS API credentials.');
    }

    // TODO: Implement UPS Tracking API
    this.throwError('NOT_IMPLEMENTED', 'UPS tracking is not yet implemented. Coming soon!');
  }

  async cancelShipment(request: CancelShipmentRequest): Promise<{ success: boolean; error?: string }> {
    if (!this.hasValidCredentials()) {
      return { 
        success: false, 
        error: 'UPS connector not configured. Please add your UPS API credentials.' 
      };
    }

    // TODO: Implement UPS Void API
    return { 
      success: false, 
      error: 'UPS shipment cancellation is not yet implemented. Coming soon!' 
    };
  }

  private hasValidCredentials(): boolean {
    const creds = this.credentials as UPSCredentials;
    // Support both legacy (accessKey, username, password) and modern (OAuth) auth
    const hasLegacyAuth = !!(creds.accessKey && creds.username && creds.password);
    const hasOAuthAuth = !!(creds.clientId && creds.clientSecret);
    return hasLegacyAuth || hasOAuthAuth;
  }
}

/* 
TODO: UPS Integration Implementation Notes

UPS APIs:
1. Rating API - Get shipping rates and service options
2. Shipping API - Create shipments and generate labels  
3. Tracking API - Track packages
4. Address Validation API - Validate addresses
5. Time in Transit API - Get delivery time estimates

Authentication Options:
1. Legacy: Access Key + Username + Password
2. Modern: OAuth 2.0 with Client ID + Client Secret

Common UPS Services:
- 01: Next Day Air
- 02: 2nd Day Air  
- 03: Ground
- 11: UPS Standard (International)
- 07: Express (International)
- 08: Expedited (International)
- 54: Express Plus (International)
- 65: UPS Saver (International)

Rate request requirements:
- Shipper number (account number)
- Ship from and ship to addresses
- Package dimensions, weight, and packaging type
- Service type
- Customer context (optional)

Shipment creation requirements:
- All rating info plus:
- Package description and contents
- Payment information  
- Service options (delivery confirmation, insurance, etc.)
- Return service (if applicable)

Tracking:
- Uses tracking numbers (1Z format)
- Can track by reference number or UPS InfoNotice number
- Provides detailed tracking events with timestamps

Error Handling:
- UPS returns detailed error codes and descriptions
- Common errors: Invalid address, weight/dimension limits, service not available
*/