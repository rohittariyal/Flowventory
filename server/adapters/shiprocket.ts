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

interface ShiprocketCredentials {
  email?: string;
  password?: string;
  token?: string; // For token-based auth
}

interface ShiprocketRate {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  cod: number;
  etd: string;
  freight_charge: number;
  other_charges: number;
}

interface ShiprocketOrder {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id: string;
  comment: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_email?: string;
  shipping_phone?: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: number;
  }>;
  payment_method: string;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export class ShiprocketAdapter extends ShippingAdapter {
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(credentials: ShiprocketCredentials, config: Record<string, any> = {}) {
    super('shiprocket', credentials, config);
    this.baseUrl = config.baseUrl || process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAuthenticated();
      
      // Test with a simple API call
      const response = await this.makeRequest('/v1/external/channels');
      
      if (response && Array.isArray(response.data)) {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from Shiprocket API' };
      }
    } catch (error: any) {
      const shippingError = this.normalizeError(error);
      return { success: false, error: shippingError.message };
    }
  }

  async getRates(request: RateRequest): Promise<ShippingRate[]> {
    try {
      await this.ensureAuthenticated();
      
      // Calculate total weight and dimensions
      const totalWeight = request.parcels.reduce((sum, parcel) => {
        const weight = this.convertWeight(parcel.weight, parcel.weightUnits, 'kg');
        return sum + weight;
      }, 0);

      // Use the largest dimensions (Shiprocket expects single package dimensions)
      const maxParcel = request.parcels.reduce((max, parcel) => {
        const volume = parcel.length * parcel.width * parcel.height;
        const maxVolume = max.length * max.width * max.height;
        return volume > maxVolume ? parcel : max;
      });

      const length = this.convertDimensions(maxParcel.length, maxParcel.units, 'cm');
      const width = this.convertDimensions(maxParcel.width, maxParcel.units, 'cm');
      const height = this.convertDimensions(maxParcel.height, maxParcel.units, 'cm');

      const payload = {
        pickup_postcode: request.shipFrom.postalCode,
        delivery_postcode: request.shipTo.postalCode,
        weight: totalWeight,
        length,
        width,
        height,
        declared_value: request.items ? 
          request.items.reduce((sum, item) => sum + (item.value * item.quantity), 0) / 100 : 100, // Convert from cents
        cod: 0 // Cash on delivery - 0 for prepaid
      };

      const response = await this.makeRequest('/v1/external/courier/serviceability/', {
        method: 'GET',
        params: payload
      });

      if (!response || !response.data || !response.data.available_courier_companies) {
        return [];
      }

      const rates: ShippingRate[] = response.data.available_courier_companies.map((courier: ShiprocketRate) => ({
        service: courier.courier_name,
        serviceCode: courier.courier_company_id.toString(),
        currency: 'INR', // Shiprocket primarily operates in INR
        amount: Math.round(courier.rate * 100), // Convert to cents
        estimatedDays: this.parseETD(courier.etd),
        provider: 'shiprocket'
      }));

      return rates;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async createShipment(request: CreateShipmentRequest): Promise<ShipmentResult> {
    try {
      await this.ensureAuthenticated();

      // Create order first
      const orderPayload = this.buildOrderPayload(request);
      const orderResponse = await this.makeRequest('/v1/external/orders/create/adhoc', {
        method: 'POST',
        body: orderPayload
      });

      if (!orderResponse || !orderResponse.order_id) {
        this.throwError('CREATE_ERROR', 'Failed to create order with Shiprocket');
      }

      const orderId = orderResponse.order_id;

      // Create shipment
      const shipmentPayload = {
        order_id: orderId,
        courier_id: parseInt(request.service), // service should contain courier company ID
        is_return: 0,
        is_insurance: 0
      };

      const shipmentResponse = await this.makeRequest('/v1/external/courier/assign/awb', {
        method: 'POST',
        body: shipmentPayload
      });

      if (!shipmentResponse || !shipmentResponse.awb_assign_status || shipmentResponse.awb_assign_status !== 1) {
        this.throwError('CREATE_ERROR', 'Failed to assign AWB for shipment');
      }

      // Get shipment details
      const shipmentId = shipmentResponse.response.data.shipment_id;
      const awb = shipmentResponse.response.data.awb_code;

      return {
        id: `shiprocket-${shipmentId}`,
        providerShipmentId: shipmentId.toString(),
        trackingNumber: awb,
        trackingUrl: `https://shiprocket.in/tracking/${awb}`,
        labelUrl: `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${shipmentId}`,
        cost: {
          currency: 'INR',
          amount: Math.round((shipmentResponse.response.data.courier_charge || 0) * 100)
        },
        status: 'label_created'
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getTracking(request: TrackingRequest): Promise<TrackingResult> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest(`/v1/external/courier/track/awb/${request.trackingNumber}`, {
        method: 'GET'
      });

      if (!response || !response.tracking_data) {
        this.throwError('TRACK_ERROR', 'No tracking data found');
      }

      const trackingData = response.tracking_data;
      const events = trackingData.shipment_track.map((track: any) => ({
        timestamp: track.date,
        status: this.normalizeStatus(track.current_status),
        location: track.location || '',
        description: track.current_status || 'No description',
        code: track.sr_status_label
      }));

      return {
        trackingNumber: request.trackingNumber,
        status: this.normalizeStatus(trackingData.track_status),
        events: events.reverse(), // Most recent first
        estimatedDelivery: trackingData.etd,
        actualDelivery: trackingData.delivered_date
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async cancelShipment(request: CancelShipmentRequest): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest('/v1/external/orders/cancel', {
        method: 'POST',
        body: {
          ids: [parseInt(request.providerShipmentId)]
        }
      });

      if (response && response.message === 'Order cancelled successfully') {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to cancel shipment' };
      }
    } catch (error) {
      const shippingError = this.normalizeError(error);
      return { success: false, error: shippingError.message };
    }
  }

  // Private helper methods
  private async ensureAuthenticated(): Promise<void> {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return; // Token still valid
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const creds = this.credentials as ShiprocketCredentials;
    
    // If we have a token directly, use it
    if (creds.token) {
      this.token = creds.token;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      return;
    }

    // Otherwise authenticate with email/password
    if (!creds.email || !creds.password) {
      this.throwError('AUTH_ERROR', 'Missing Shiprocket email/password or token');
    }

    const response = await fetch(`${this.baseUrl}/v1/external/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: creds.email,
        password: creds.password
      })
    });

    if (!response.ok) {
      this.throwError('AUTH_ERROR', 'Shiprocket authentication failed');
    }

    const data = await response.json();
    
    if (!data.token) {
      this.throwError('AUTH_ERROR', 'No token received from Shiprocket');
    }

    this.token = data.token;
    this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  }

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    let url = `${this.baseUrl}${endpoint}`;
    const config: any = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    if (options.params && options.method === 'GET') {
      const searchParams = new URLSearchParams(options.params);
      const separator = url.includes('?') ? '&' : '?';
      url += separator + searchParams.toString();
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private buildOrderPayload(request: CreateShipmentRequest): ShiprocketOrder {
    const shipFrom = this.formatAddress(request.shipFrom);
    const shipTo = this.formatAddress(request.shipTo);
    const orderDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const orderId = `ORDER-${Date.now()}`;

    // Calculate package dimensions and weight
    const totalWeight = request.parcels.reduce((sum, parcel) => {
      return sum + this.convertWeight(parcel.weight, parcel.weightUnits, 'kg');
    }, 0);

    const maxParcel = request.parcels.reduce((max, parcel) => {
      const volume = parcel.length * parcel.width * parcel.height;
      const maxVolume = max.length * max.width * max.height;
      return volume > maxVolume ? parcel : max;
    });

    const orderItems = request.items || [{
      name: 'Package',
      sku: 'DEFAULT-SKU',
      quantity: 1,
      value: 10000, // Default value in cents (100 INR)
      weight: 1
    }];

    const subTotal = orderItems.reduce((sum, item) => sum + (item.value * item.quantity), 0) / 100;

    return {
      order_id: orderId,
      order_date: orderDate,
      pickup_location: 'Primary',
      channel_id: '',
      comment: request.description || 'Shipment via Flowventory',
      billing_customer_name: shipTo.name || 'Customer',
      billing_last_name: '',
      billing_address: shipTo.address1,
      billing_address_2: shipTo.address2,
      billing_city: shipTo.city,
      billing_pincode: shipTo.postalCode,
      billing_state: shipTo.state,
      billing_country: shipTo.country,
      billing_email: shipTo.email || 'customer@example.com',
      billing_phone: shipTo.phone || '9999999999',
      shipping_is_billing: true,
      order_items: orderItems.map(item => ({
        name: item.name,
        sku: item.sku,
        units: item.quantity,
        selling_price: item.value / 100, // Convert from cents
        discount: 0,
        tax: 0,
        hsn: 0
      })),
      payment_method: 'Prepaid',
      sub_total: subTotal,
      length: this.convertDimensions(maxParcel.length, maxParcel.units, 'cm'),
      breadth: this.convertDimensions(maxParcel.width, maxParcel.units, 'cm'),
      height: this.convertDimensions(maxParcel.height, maxParcel.units, 'cm'),
      weight: totalWeight
    };
  }

  private parseETD(etd: string): number | undefined {
    // Shiprocket ETD format is typically like "3-4 Days"
    const match = etd.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  private normalizeStatus(status: string): 'created' | 'label_created' | 'picked_up' | 'in_transit' | 'delivered' | 'exception' | 'cancelled' {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes('delivered')) return 'delivered';
    if (lowerStatus.includes('out for delivery') || lowerStatus.includes('in transit')) return 'in_transit';
    if (lowerStatus.includes('picked') || lowerStatus.includes('dispatched')) return 'picked_up';
    if (lowerStatus.includes('manifested') || lowerStatus.includes('ready')) return 'label_created';
    if (lowerStatus.includes('cancelled')) return 'cancelled';
    if (lowerStatus.includes('exception') || lowerStatus.includes('undelivered')) return 'exception';
    
    return 'created';
  }
}