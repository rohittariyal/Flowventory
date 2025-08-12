// Reorder Service for Restock Autopilot V1
// Handles intelligent quantity recommendations based on lead times, sales velocity, and stock levels

interface ReorderSuggestionParams {
  sku: string;
  stock: number;
  dailySales: number;
  leadTimeDays: number;
  targetDaysCover: number;
  safetyDays: number;
  packSize?: number;
  moq?: number;
  maxDaysCover?: number;
}

interface ReorderSuggestion {
  recommendedQty: number;
  reasoning: {
    demandWindow: number;
    rawRecommendation: number;
    packSizeAdjustment?: number;
    moqAdjustment?: number;
    maxCapAdjustment?: number;
  };
  costEstimate?: number;
  currency?: string;
}

export class ReorderService {
  /**
   * Calculate intelligent reorder quantity based on:
   * - Current stock levels
   * - Daily sales velocity
   * - Lead time requirements
   * - Safety stock preferences
   * - Supplier constraints (MOQ, pack sizes)
   */
  static suggestQuantity(params: ReorderSuggestionParams): ReorderSuggestion {
    const {
      stock,
      dailySales,
      leadTimeDays,
      targetDaysCover,
      safetyDays,
      packSize,
      moq,
      maxDaysCover
    } = params;

    console.log(`📊 Calculating reorder for ${params.sku}:`, {
      stock,
      dailySales,
      leadTimeDays,
      targetDaysCover,
      safetyDays
    });

    // Calculate demand window: lead time + safety buffer + target coverage
    const demandWindow = leadTimeDays + safetyDays + targetDaysCover;
    
    // Calculate total demand during this window
    const totalDemand = demandWindow * dailySales;
    
    // Calculate raw recommendation (what we need minus what we have)
    const rawRecommendation = Math.max(0, totalDemand - stock);
    
    let recommendedQty = rawRecommendation;
    const reasoning: ReorderSuggestion['reasoning'] = {
      demandWindow,
      rawRecommendation
    };

    // Apply pack size constraints
    if (packSize && packSize > 1) {
      const packAdjusted = Math.ceil(recommendedQty / packSize) * packSize;
      reasoning.packSizeAdjustment = packAdjusted;
      recommendedQty = packAdjusted;
    }

    // Apply minimum order quantity
    if (moq && recommendedQty < moq) {
      reasoning.moqAdjustment = moq;
      recommendedQty = moq;
    }

    // Apply maximum days cover cap to avoid overstock
    if (maxDaysCover) {
      const maxStock = maxDaysCover * dailySales;
      const maxOrderQty = Math.max(0, maxStock - stock);
      if (recommendedQty > maxOrderQty) {
        reasoning.maxCapAdjustment = maxOrderQty;
        recommendedQty = maxOrderQty;
      }
    }

    console.log(`✅ Reorder suggestion for ${params.sku}: ${recommendedQty} units`, reasoning);

    return {
      recommendedQty: Math.round(recommendedQty),
      reasoning
    };
  }

  /**
   * Calculate estimated days of coverage with current stock
   */
  static calculateDaysCoverage(stock: number, dailySales: number): number {
    if (dailySales <= 0) return Number.MAX_SAFE_INTEGER;
    return Math.round(stock / dailySales);
  }

  /**
   * Determine if SKU needs reordering based on current stock and lead time
   */
  static needsReorder(
    stock: number, 
    dailySales: number, 
    leadTimeDays: number, 
    safetyDays: number = 3
  ): boolean {
    const daysLeft = this.calculateDaysCoverage(stock, dailySales);
    const minimumRequired = leadTimeDays + safetyDays;
    return daysLeft <= minimumRequired;
  }

  /**
   * Calculate cost estimate for purchase order
   */
  static calculateCostEstimate(
    quantity: number,
    unitCost: number,
    taxRate: number = 0
  ): { subtotal: number; tax: number; total: number } {
    const subtotal = quantity * unitCost;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
}