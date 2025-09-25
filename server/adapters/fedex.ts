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

interface FedExCredentials {
  accountNumber?: string;
  meterNumber?: string;
  key?: string;           // Web Services Key (legacy)
  password?: string;      // Web Services Password (legacy) 
  apiKey?: string;        // REST API Key (modern)
  secretKey?: string;     // REST API Secret (modern)
  clientId?: string;      // OAuth Client ID
  clientSecret?: string;  // OAuth Client Secret
}

export class FedExAdapter extends ShippingAdapter {
  private baseUrl: string;

  constructor(credentials: FedExCredentials, config: Record<string, any> = {}) {
    super('fedex', credentials, config);
    this.baseUrl = config.baseUrl || process.env.FEDEX_BASE_URL || 'https://apis-sandbox.fedex.com'; // Sandbox environment
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.hasValidCredentials()) {
      return { 
        success: false, 
        error: 'FedEx connector not configured. Please add your FedEx API credentials in Settings → Shipping Integrations.' 
      };
    }

    // TODO: Implement actual FedEx API test
    return { 
      success: false, 
      error: 'FedEx integration is not yet implemented. Coming soon!' 
    };
  }

  async getRates(request: RateRequest): Promise<ShippingRate[]> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'FedEx connector not configured. Please add your FedEx API credentials.');
    }

    // TODO: Implement FedEx Rate Services API
    this.throwError('NOT_IMPLEMENTED', 'FedEx rate shopping is not yet implemented. Coming soon!');
  }

  async createShipment(request: CreateShipmentRequest): Promise<ShipmentResult> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'FedEx connector not configured. Please add your FedEx API credentials.');
    }

    // TODO: Implement FedEx Ship Services API
    this.throwError('NOT_IMPLEMENTED', 'FedEx shipment creation is not yet implemented. Coming soon!');
  }

  async getTracking(request: TrackingRequest): Promise<TrackingResult> {
    if (!this.hasValidCredentials()) {
      this.throwError('CONFIG_ERROR', 'FedEx connector not configured. Please add your FedEx API credentials.');
    }

    // TODO: Implement FedEx Track Services API
    this.throwError('NOT_IMPLEMENTED', 'FedEx tracking is not yet implemented. Coming soon!');
  }

  async cancelShipment(request: CancelShipmentRequest): Promise<{ success: boolean; error?: string }> {
    if (!this.hasValidCredentials()) {
      return { 
        success: false, 
        error: 'FedEx connector not configured. Please add your FedEx API credentials.' 
      };
    }

    // TODO: Implement FedEx Delete Shipment API
    return { 
      success: false, 
      error: 'FedEx shipment cancellation is not yet implemented. Coming soon!' 
    };
  }

  private hasValidCredentials(): boolean {
    const creds = this.credentials as FedExCredentials;
    const hasAccountAndMeter = !!(creds.accountNumber && creds.meterNumber);
    
    // Legacy Web Services authentication
    const hasLegacyAuth = !!(creds.key && creds.password);
    
    // Modern REST API authentication
    const hasRestAuth = !!(creds.apiKey && creds.secretKey);
    
    // OAuth authentication
    const hasOAuthAuth = !!(creds.clientId && creds.clientSecret);
    
    return hasAccountAndMeter && (hasLegacyAuth || hasRestAuth || hasOAuthAuth);
  }
}

/* 
TODO: FedEx Integration Implementation Notes

FedEx APIs:
1. Rate Services - Get shipping rates and transit times
2. Ship Services - Create shipments and generate shipping labels
3. Track Services - Track packages and get delivery updates
4. Address Validation Services - Validate and standardize addresses
5. Location Services - Find FedEx locations and service areas

Authentication Options:
1. Legacy Web Services: Key + Password + Account + Meter
2. REST API: API Key + Secret Key + Account + Meter  
3. OAuth 2.0: Client ID + Client Secret + Account + Meter

Common FedEx Services:
- PRIORITY_OVERNIGHT: FedEx Priority Overnight
- STANDARD_OVERNIGHT: FedEx Standard Overnight  
- FIRST_OVERNIGHT: FedEx First Overnight
- FEDEX_2_DAY: FedEx 2Day
- FEDEX_2_DAY_AM: FedEx 2Day A.M.
- FEDEX_EXPRESS_SAVER: FedEx Express Saver
- FEDEX_GROUND: FedEx Ground
- GROUND_HOME_DELIVERY: FedEx Ground Home Delivery
- INTERNATIONAL_ECONOMY: FedEx International Economy
- INTERNATIONAL_PRIORITY: FedEx International Priority
- INTERNATIONAL_FIRST: FedEx International First

Rate request requirements:
- Account number and meter number
- Ship date
- Service type
- Packaging type  
- Shipper and recipient addresses
- Package weight and dimensions
- Declared value (for international)

Shipment creation requirements:
- All rate request fields plus:
- Package line items with descriptions
- Customs information (international)
- Special services (signature, insurance, etc.)
- Label specifications (format, type, etc.)

Tracking:
- Uses FedEx tracking numbers (typically 12-digit or 20-digit)
- Can track by door tag number, ground shipment ID, etc.
- Provides detailed scan events with locations and timestamps
- Supports tracking multiple packages at once

Special Features:
- Pickup scheduling
- Hold at location services  
- Delivery notifications
- Returns processing
- Multi-piece shipments

Error Handling:
- FedEx returns structured error responses
- Common errors: Invalid service for route, address validation failures, weight/dimension restrictions
*/