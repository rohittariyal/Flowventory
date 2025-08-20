// Currency formatting and conversion utilities
export function currencyFormat(amount: number, currency: string, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Foreign exchange conversion using manual rates from finance settings
export function fx(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Get manual rates from localStorage finance settings
  const settings = JSON.parse(localStorage.getItem('flowventory:settings') || '{}');
  const manualRates = settings.finance?.manualRates || {};
  
  // Convert to base currency first, then to target currency
  const baseCurrency = settings.finance?.baseCurrency || 'USD';
  
  if (fromCurrency !== baseCurrency) {
    // Convert from source to base
    const fromRate = manualRates[fromCurrency] || 1;
    amount = amount / fromRate;
  }
  
  if (toCurrency !== baseCurrency) {
    // Convert from base to target
    const toRate = manualRates[toCurrency] || 1;
    amount = amount * toRate;
  }
  
  return amount;
}

// Calculate invoice totals from line items
export interface LineItem {
  skuId: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: number; // 0 to 1 (e.g., 0.2 for 20%)
}

export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export function calcInvoiceTotals(lineItems: LineItem[]): InvoiceTotals {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice * item.taxRate), 0);
  const grandTotal = subtotal + taxTotal;
  
  return { subtotal, taxTotal, grandTotal };
}