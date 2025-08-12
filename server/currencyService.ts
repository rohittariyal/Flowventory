// Currency conversion service with static rates for v1
export class CurrencyService {
  private static rates: Record<string, number> = {
    // Base conversions to USD (for cross-currency calculations)
    "USD": 1.0,
    "GBP": 1.25,  // 1 GBP = 1.25 USD
    "EUR": 1.05,  // 1 EUR = 1.05 USD
    "INR": 0.012, // 1 INR = 0.012 USD
    "AED": 0.272, // 1 AED = 0.272 USD
    "SGD": 0.74,  // 1 SGD = 0.74 USD
  };

  static getRate(from: string, to: string): number {
    if (from === to) return 1.0;
    
    // Check if we have a direct conversion
    const directKey = `${from}->${to}`;
    if (this.rates[directKey]) {
      return this.rates[directKey];
    }

    // Use USD as pivot for cross-currency conversion
    const fromToUsd = this.rates[from];
    const usdToTarget = 1 / this.rates[to];
    
    if (!fromToUsd || !this.rates[to]) {
      throw new Error(`Currency conversion not supported: ${from} to ${to}`);
    }

    return fromToUsd * usdToTarget;
  }

  static convert(amount: number, from: string, to: string): number {
    const rate = this.getRate(from, to);
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }

  static convertToBase(amount: number, from: string, baseCurrency: string): number {
    return this.convert(amount, from, baseCurrency);
  }

  static getSupportedCurrencies(): string[] {
    return Object.keys(this.rates);
  }
}