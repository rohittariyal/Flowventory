import { BatchInventory, BatchEvent, Product } from "@/data/seedProductData";
import { generateBatchId, now } from "./batchUtils";

// Storage keys
const BATCH_INVENTORY_KEY = "flowventory:inventory";
const BATCH_EVENTS_KEY = "flowventory:batches:events";
const PRODUCTS_KEY = "flowventory:products";

// Initialize batch storage
export const initializeBatchStorage = () => {
  if (!localStorage.getItem(BATCH_INVENTORY_KEY)) {
    localStorage.setItem(BATCH_INVENTORY_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(BATCH_EVENTS_KEY)) {
    localStorage.setItem(BATCH_EVENTS_KEY, JSON.stringify([]));
  }
};

// Batch Inventory CRUD Operations
export const getAllBatchInventory = (): BatchInventory[] => {
  try {
    const data = localStorage.getItem(BATCH_INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading batch inventory:", error);
    return [];
  }
};

export const saveBatchInventory = (batches: BatchInventory[]): void => {
  try {
    localStorage.setItem(BATCH_INVENTORY_KEY, JSON.stringify(batches));
  } catch (error) {
    console.error("Error saving batch inventory:", error);
  }
};

export const getBatchesByProduct = (productId: string): BatchInventory[] => {
  return getAllBatchInventory().filter(batch => batch.productId === productId);
};

export const getBatchesByLocation = (locationId: string): BatchInventory[] => {
  return getAllBatchInventory().filter(batch => batch.locationId === locationId);
};

export const getBatchesByProductAndLocation = (productId: string, locationId: string): BatchInventory[] => {
  return getAllBatchInventory().filter(
    batch => batch.productId === productId && batch.locationId === locationId
  );
};

export const getBatchByNo = (productId: string, locationId: string, batchNo: string): BatchInventory | undefined => {
  return getAllBatchInventory().find(
    batch => batch.productId === productId && 
             batch.locationId === locationId && 
             batch.batchNo === batchNo
  );
};

export const addOrUpdateBatch = (batchData: Omit<BatchInventory, 'id'>): BatchInventory => {
  const batches = getAllBatchInventory();
  
  // Check if batch already exists
  const existingIndex = batches.findIndex(
    batch => batch.productId === batchData.productId &&
             batch.locationId === batchData.locationId &&
             batch.batchNo === batchData.batchNo
  );

  if (existingIndex >= 0) {
    // Update existing batch (add quantities)
    batches[existingIndex].qty += batchData.qty;
    const updatedBatch = batches[existingIndex];
    saveBatchInventory(batches);
    return updatedBatch;
  } else {
    // Create new batch
    const newBatch: BatchInventory = {
      id: generateBatchId(),
      ...batchData
    };
    batches.push(newBatch);
    saveBatchInventory(batches);
    return newBatch;
  }
};

export const updateBatchQty = (batchId: string, newQty: number): boolean => {
  const batches = getAllBatchInventory();
  const batchIndex = batches.findIndex(batch => batch.id === batchId);
  
  if (batchIndex >= 0) {
    batches[batchIndex].qty = newQty;
    saveBatchInventory(batches);
    return true;
  }
  return false;
};

export const deleteBatch = (batchId: string): boolean => {
  const batches = getAllBatchInventory();
  const filteredBatches = batches.filter(batch => batch.id !== batchId);
  
  if (filteredBatches.length !== batches.length) {
    saveBatchInventory(filteredBatches);
    return true;
  }
  return false;
};

// Batch Events CRUD Operations
export const getAllBatchEvents = (): BatchEvent[] => {
  try {
    const data = localStorage.getItem(BATCH_EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading batch events:", error);
    return [];
  }
};

export const saveBatchEvents = (events: BatchEvent[]): void => {
  try {
    localStorage.setItem(BATCH_EVENTS_KEY, JSON.stringify(events));
  } catch (error) {
    console.error("Error saving batch events:", error);
  }
};

export const addBatchEvent = (eventData: Omit<BatchEvent, 'id' | 'timestamp'>): BatchEvent => {
  const events = getAllBatchEvents();
  
  const newEvent: BatchEvent = {
    id: generateBatchId(),
    timestamp: now(),
    ...eventData
  };
  
  events.push(newEvent);
  saveBatchEvents(events);
  
  return newEvent;
};

export const getBatchEventsByProduct = (productId: string): BatchEvent[] => {
  return getAllBatchEvents().filter(event => event.productId === productId);
};

export const getBatchEventsByBatch = (productId: string, locationId: string, batchNo: string): BatchEvent[] => {
  return getAllBatchEvents().filter(
    event => event.productId === productId &&
             event.locationId === locationId &&
             event.batchNo === batchNo
  );
};

// Product management functions
export const updateProductBatchTracking = (productId: string, isBatchTracked: boolean, shelfLifeDays?: number): boolean => {
  try {
    const products = getProductsFromStorage();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex >= 0) {
      products[productIndex].isBatchTracked = isBatchTracked;
      if (shelfLifeDays !== undefined) {
        products[productIndex].shelfLifeDays = shelfLifeDays;
      }
      
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating product batch tracking:", error);
    return false;
  }
};

const getProductsFromStorage = (): Product[] => {
  try {
    const data = localStorage.getItem(PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
};

// Calculate total stock from batches for a product
export const calculateProductStockFromBatches = (productId: string): number => {
  const batches = getBatchesByProduct(productId);
  return batches.reduce((total, batch) => total + batch.qty, 0);
};

// Synchronize product stock with batch totals
export const syncProductStockWithBatches = (productId: string): boolean => {
  try {
    const products = getProductsFromStorage();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex >= 0 && products[productIndex].isBatchTracked) {
      const totalStock = calculateProductStockFromBatches(productId);
      products[productIndex].stock = totalStock;
      products[productIndex].available = Math.max(0, totalStock - (products[productIndex].reserved || 0));
      
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error syncing product stock:", error);
    return false;
  }
};

// Batch operation wrappers that create events and update inventory
export const receiveBatch = (
  productId: string,
  locationId: string,
  batchNo: string,
  qty: number,
  mfgDate?: string,
  expiryDate?: string,
  refType?: "PO" | "MANUAL",
  refId?: string,
  note?: string
): { batch: BatchInventory; event: BatchEvent } => {
  // Add batch to inventory
  const batch = addOrUpdateBatch({
    productId,
    locationId,
    batchNo,
    mfgDate,
    expiryDate,
    qty
  });

  // Create receipt event
  const event = addBatchEvent({
    type: "RECEIPT",
    productId,
    locationId,
    batchNo,
    qty,
    refType,
    refId,
    note
  });

  // Sync product stock
  syncProductStockWithBatches(productId);

  return { batch, event };
};

export const adjustBatch = (
  productId: string,
  locationId: string,
  batchNo: string,
  qtyChange: number,
  note?: string
): { success: boolean; event?: BatchEvent } => {
  const batch = getBatchByNo(productId, locationId, batchNo);
  if (!batch) {
    return { success: false };
  }

  const newQty = batch.qty + qtyChange;
  if (newQty < 0) {
    return { success: false };
  }

  // Update batch quantity
  updateBatchQty(batch.id, newQty);

  // Create adjustment event
  const event = addBatchEvent({
    type: "ADJUST",
    productId,
    locationId,
    batchNo,
    qty: qtyChange,
    refType: "MANUAL",
    note
  });

  // Sync product stock
  syncProductStockWithBatches(productId);

  return { success: true, event };
};

// Get all distinct locations from batch inventory
export const getAllLocations = (): string[] => {
  const batches = getAllBatchInventory();
  const locations = new Set(batches.map(batch => batch.locationId));
  return Array.from(locations).sort();
};

// Get all distinct batch numbers for a product
export const getBatchNumbers = (productId: string): string[] => {
  const batches = getBatchesByProduct(productId);
  const batchNos = new Set(batches.map(batch => batch.batchNo));
  return Array.from(batchNos).sort();
};