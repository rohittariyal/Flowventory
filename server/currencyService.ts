// In-memory currency conversion service with static rates
export class CurrencyService {
  // Static exchange rates (base: USD)
  private static readonly rates: Record<string, number> = {
    USD: 1.0,
    GBP: 0.79,    // 1 USD = 0.79 GBP
    EUR: 0.85,    // 1 USD = 0.85 EUR
    INR: 83.12,   // 1 USD = 83.12 INR
    AED: 3.67,    // 1 USD = 3.67 AED
    SGD: 1.34,    // 1 USD = 1.34 SGD
  };

  // Convert amount from source currency to target currency
  static convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = this.rates[fromCurrency.toUpperCase()];
    const toRate = this.rates[toCurrency.toUpperCase()];
    
    if (!fromRate || !toRate) {
      console.warn(`Currency conversion not supported: ${fromCurrency} -> ${toCurrency}, using 1:1 rate`);
      return amount;
    }
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  // Get supported currencies
  static getSupportedCurrencies(): string[] {
    return Object.keys(this.rates);
  }

  // Check if currency is supported
  static isSupported(currency: string): boolean {
    return currency.toUpperCase() in this.rates;
  }
}