import { BatchInventory, BatchStatus, FifoPick } from "@/data/seedProductData";

// Date utility functions
export const now = (): string => {
  return new Date().toISOString();
};

export const addDays = (date: string | Date, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const daysUntil = (date: string | Date): number => {
  const target = new Date(date);
  const today = new Date();
  // Reset time to start of day for accurate day calculation
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};

export const isValidDate = (date: string): boolean => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

// Batch status determination
export const statusFor = (expiryDate?: string): BatchStatus => {
  if (!expiryDate) return "OK";
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  
  // Set both dates to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  if (today > expiry) {
    return "EXPIRED";
  } else if (daysUntil(expiryDate) <= 30) {
    return "EXPIRING_SOON";
  } else {
    return "OK";
  }
};

// FIFO picking logic
export const fifoPick = (batches: BatchInventory[], requiredQty: number): FifoPick[] => {
  if (requiredQty <= 0) return [];
  
  // Filter out expired batches and sort by expiry date (earliest first)
  const availableBatches = batches
    .filter(batch => {
      const status = statusFor(batch.expiryDate);
      return batch.qty > 0 && status !== "EXPIRED";
    })
    .sort((a, b) => {
      // Sort by expiry date (earliest first), then by batch number
      if (a.expiryDate && b.expiryDate) {
        const aDate = new Date(a.expiryDate);
        const bDate = new Date(b.expiryDate);
        if (aDate.getTime() !== bDate.getTime()) {
          return aDate.getTime() - bDate.getTime();
        }
      }
      // If expiry dates are same or missing, sort by batch number
      return a.batchNo.localeCompare(b.batchNo);
    });

  const picks: FifoPick[] = [];
  let remainingQty = requiredQty;

  for (const batch of availableBatches) {
    if (remainingQty <= 0) break;
    
    const pickQty = Math.min(batch.qty, remainingQty);
    picks.push({
      batchNo: batch.batchNo,
      qty: pickQty,
      expiryDate: batch.expiryDate
    });
    
    remainingQty -= pickQty;
  }

  return picks;
};

// Calculate total available quantity for FIFO picking
export const getAvailableQtyForFifo = (batches: BatchInventory[]): number => {
  return batches
    .filter(batch => {
      const status = statusFor(batch.expiryDate);
      return batch.qty > 0 && status !== "EXPIRED";
    })
    .reduce((total, batch) => total + batch.qty, 0);
};

// Get batches by status
export const getBatchesByStatus = (batches: BatchInventory[], status: BatchStatus): BatchInventory[] => {
  return batches.filter(batch => statusFor(batch.expiryDate) === status);
};

// Calculate expiry date from manufacturing date and shelf life
export const calculateExpiryDate = (mfgDate: string, shelfLifeDays: number): string => {
  return addDays(mfgDate, shelfLifeDays);
};

// Validate batch data
export const validateBatch = (batch: Partial<BatchInventory>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!batch.batchNo || batch.batchNo.trim() === "") {
    errors.push("Batch number is required");
  }

  if (!batch.qty || batch.qty <= 0) {
    errors.push("Quantity must be greater than 0");
  }

  if (batch.expiryDate && !isValidDate(batch.expiryDate)) {
    errors.push("Invalid expiry date");
  }

  if (batch.mfgDate && !isValidDate(batch.mfgDate)) {
    errors.push("Invalid manufacturing date");
  }

  if (batch.mfgDate && batch.expiryDate) {
    const mfgTime = new Date(batch.mfgDate).getTime();
    const expTime = new Date(batch.expiryDate).getTime();
    if (mfgTime >= expTime) {
      errors.push("Expiry date must be after manufacturing date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate unique batch ID
export const generateBatchId = (): string => {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get batch summary statistics
export const getBatchSummary = (batches: BatchInventory[]) => {
  const total = batches.reduce((sum, batch) => sum + batch.qty, 0);
  const expired = getBatchesByStatus(batches, "EXPIRED");
  const expiringSoon = getBatchesByStatus(batches, "EXPIRING_SOON");
  const ok = getBatchesByStatus(batches, "OK");

  return {
    totalBatches: batches.length,
    totalQty: total,
    expired: {
      count: expired.length,
      qty: expired.reduce((sum, batch) => sum + batch.qty, 0)
    },
    expiringSoon: {
      count: expiringSoon.length,
      qty: expiringSoon.reduce((sum, batch) => sum + batch.qty, 0)
    },
    ok: {
      count: ok.length,
      qty: ok.reduce((sum, batch) => sum + batch.qty, 0)
    }
  };
};