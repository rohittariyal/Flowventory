import { type ReorderSuggestion, type ReorderSuggestData } from "@shared/schema";
import { type IStorage } from "./storage";

export class ReorderService {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  async generateSuggestion(workspaceId: string, data: ReorderSuggestData): Promise<ReorderSuggestion> {
    const { sku, stock, dailySales } = data;
    
    // Get supplier that handles this SKU
    const suppliers = await this.storage.getSuppliers(workspaceId, { sku });
    const supplier = suppliers.find(s => 
      s.skus.some(skuData => skuData.sku === sku)
    );
    
    // Get reorder policy for this SKU
    const policy = await this.storage.getReorderPolicy(workspaceId, sku);
    
    let recommendedQty = 0;
    let calculation = null;
    
    if (policy && dailySales > 0) {
      const currentDaysLeft = Math.floor(stock / dailySales);
      const targetDaysNeeded = policy.targetDaysCover + policy.safetyDays;
      
      // Get supplier's SKU data for lead time
      const supplierSkuData = supplier?.skus.find(s => s.sku === sku);
      const leadTimeDays = supplierSkuData?.leadTimeDays || 0;
      const totalDaysNeeded = targetDaysNeeded + leadTimeDays;
      
      const shortfall = Math.max(0, (totalDaysNeeded * dailySales) - stock);
      
      if (shortfall > 0) {
        recommendedQty = Math.ceil(shortfall);
        
        // Round to pack size if specified
        if (supplierSkuData?.packSize && supplierSkuData.packSize > 1) {
          recommendedQty = Math.ceil(recommendedQty / supplierSkuData.packSize) * supplierSkuData.packSize;
        }
        
        // Apply MOQ if specified
        if (supplierSkuData?.moq && recommendedQty < supplierSkuData.moq) {
          recommendedQty = supplierSkuData.moq;
        }
        
        calculation = {
          currentDaysLeft,
          targetDaysNeeded: totalDaysNeeded,
          shortfall,
          roundedToPackSize: supplierSkuData?.packSize ? recommendedQty : undefined,
          adjustedForMOQ: supplierSkuData?.moq && recommendedQty === supplierSkuData.moq ? recommendedQty : undefined,
        };
      }
    }
    
    const supplierSkuData = supplier?.skus.find(s => s.sku === sku);
    
    return {
      recommendedQty,
      supplier: supplier ? {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || undefined,
        currency: supplier.currency,
      } : null,
      unitCost: supplierSkuData?.unitCost || null,
      leadTimeDays: supplierSkuData?.leadTimeDays || null,
      policy: policy ? {
        targetDaysCover: policy.targetDaysCover,
        safetyDays: policy.safetyDays,
        maxDaysCover: policy.maxDaysCover || undefined,
      } : null,
      calculation,
    };
  }
}