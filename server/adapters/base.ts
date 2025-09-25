// Base shipping adapter interface for all providers
// Normalizes different provider APIs to a consistent interface

export interface ShippingRate {
  service: string;         // Human-readable service name (e.g., "Standard", "Express")
  serviceCode: string;     // Provider-specific service code
  currency: string;        // Currency code (USD, GBP, etc.)
  amount: number;         // Cost in cents
  estimatedDays?: number; // Estimated delivery days
  provider: string;       // Provider name for identification
}

export interface ShipmentResult {
  id: string;                 // Our internal shipment ID  
  providerShipmentId: string; // Provider's shipment ID
  trackingNumber?: string;    // Tracking number
  trackingUrl?: string;       // URL to track the shipment
  labelUrl?: string;         // URL to download shipping label
  cost: {
    currency: string;
    amount: number; // In cents
  };
  estimatedDays?: number;
  status: 'created' | 'label_created' | 'picked_up' | 'in_transit' | 'delivered' | 'exception' | 'cancelled';
}

export interface TrackingEvent {
  timestamp: string;    // ISO timestamp
  status: string;       // Normalized status
  location?: string;    // Location if available
  description: string;  // Human-readable description
  code?: string;       // Provider-specific event code
}

export interface TrackingResult {
  trackingNumber: string;
  status: 'created' | 'label_created' | 'picked_up' | 'in_transit' | 'delivered' | 'exception' | 'cancelled';
  events: TrackingEvent[];
  estimatedDelivery?: string; // ISO timestamp
  actualDelivery?: string;    // ISO timestamp
}

export interface Address {
  name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO country code
  phone?: string;
  email?: string;
}

export interface Parcel {
  length: number;      // In specified units
  width: number;       // In specified units
  height: number;      // In specified units
  weight: number;      // In specified weight units
  units: 'cm' | 'in'; // Dimension units
  weightUnits: 'kg' | 'lb'; // Weight units
}

export interface ShipmentItem {
  sku: string;
  name: string;
  quantity: number;
  value: number; // Value in cents
  weight: number; // Weight per item
}

// Request interfaces
export interface RateRequest {
  shipFrom: Address;
  shipTo: Address;
  parcels: Parcel[];
  items?: ShipmentItem[];
}

export interface CreateShipmentRequest {
  shipFrom: Address;
  shipTo: Address;
  parcels: Parcel[];
  items?: ShipmentItem[];
  service: string;        // Service code to use
  reference?: string;     // Reference number
  description?: string;   // Package description
}

export interface TrackingRequest {
  trackingNumber: string;
}

export interface CancelShipmentRequest {
  providerShipmentId: string;
}

// Error types for consistent error handling
export class ShippingError extends Error {
  public readonly code: string;
  public readonly provider: string;
  public readonly details?: any;

  constructor(code: string, message: string, provider: string, details?: any) {
    super(message);
    this.name = 'ShippingError';
    this.code = code;
    this.provider = provider;
    this.details = details;
  }
}

// Base adapter class that all providers extend
export abstract class ShippingAdapter {
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
   * Get shipping rates for the given request
   */
  abstract getRates(request: RateRequest): Promise<ShippingRate[]>;

  /**
   * Create a shipment with the provider
   */
  abstract createShipment(request: CreateShipmentRequest): Promise<ShipmentResult>;

  /**
   * Get tracking information for a shipment
   */
  abstract getTracking(request: TrackingRequest): Promise<TrackingResult>;

  /**
   * Cancel a shipment (if supported by provider)
   */
  abstract cancelShipment(request: CancelShipmentRequest): Promise<{ success: boolean; error?: string }>;

  // Helper methods for consistent error handling
  protected throwError(code: string, message: string, details?: any): never {
    throw new ShippingError(code, message, this.provider, details);
  }

  protected normalizeError(error: any): ShippingError {
    if (error instanceof ShippingError) {
      return error;
    }
    
    // Map common HTTP errors to our error codes
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return new ShippingError('AUTH_ERROR', 'Authentication failed', this.provider, error.response.data);
      } else if (status === 400) {
        return new ShippingError('VALIDATION_ERROR', 'Invalid request data', this.provider, error.response.data);
      } else if (status >= 500) {
        return new ShippingError('PROVIDER_ERROR', 'Provider service unavailable', this.provider, error.response.data);
      }
    }
    
    return new ShippingError('UNKNOWN_ERROR', error.message || 'Unknown error occurred', this.provider, error);
  }

  // Utility methods for address/weight conversions
  protected convertWeight(weight: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb'): number {
    if (fromUnit === toUnit) return weight;
    
    if (fromUnit === 'kg' && toUnit === 'lb') {
      return weight * 2.20462;
    } else if (fromUnit === 'lb' && toUnit === 'kg') {
      return weight * 0.453592;
    }
    
    return weight;
  }

  protected convertDimensions(dimension: number, fromUnit: 'cm' | 'in', toUnit: 'cm' | 'in'): number {
    if (fromUnit === toUnit) return dimension;
    
    if (fromUnit === 'cm' && toUnit === 'in') {
      return dimension * 0.393701;
    } else if (fromUnit === 'in' && toUnit === 'cm') {
      return dimension * 2.54;
    }
    
    return dimension;
  }

  // Helper to format addresses consistently
  protected formatAddress(address: Address): Address {
    return {
      ...address,
      country: address.country.toUpperCase(), // Ensure country codes are uppercase
      postalCode: address.postalCode.replace(/\s+/g, ''), // Remove spaces from postal codes
    };
  }

  // Helper to validate required credentials
  protected validateCredentials(required: string[]): void {
    const missing = required.filter(key => !this.credentials[key]);
    if (missing.length > 0) {
      this.throwError('CONFIG_ERROR', `Missing required credentials: ${missing.join(', ')}`);
    }
  }
}