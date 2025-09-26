import { nanoid } from "nanoid";
import type {
  Location,
  LocationInventory,
  StockMove,
  StockStatus,
  LocationStockBreakdown,
  ProductInventorySummary,
  TransferRequest,
  InventorySettings,
  LocationFilter
} from "@shared/schema";

// localStorage keys
const LOCATIONS_KEY = "flowventory:locations";
const INVENTORY_KEY = "flowventory:inventory";
const MOVES_KEY = "flowventory:moves";
const INVENTORY_SETTINGS_KEY = "flowventory:settings:inventory";

// Location Management
export function getLocations(): Location[] {
  const stored = localStorage.getItem(LOCATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveLocations(locations: Location[]): void {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

export function getLocationById(locationId: string): Location | null {
  const locations = getLocations();
  return locations.find(loc => loc.id === locationId) || null;
}

export function createLocation(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Location {
  const locations = getLocations();
  
  // If this is the first location or explicitly set as default, make it default
  const shouldBeDefault = data.isDefault || locations.length === 0;
  
  // If setting as default, remove default from other locations
  if (shouldBeDefault) {
    locations.forEach(loc => loc.isDefault = false);
  }
  
  const newLocation: Location = {
    id: nanoid(),
    ...data,
    isDefault: shouldBeDefault,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  locations.push(newLocation);
  saveLocations(locations);
  return newLocation;
}

export function updateLocation(locationId: string, updates: Partial<Location>): Location | null {
  const locations = getLocations();
  const index = locations.findIndex(loc => loc.id === locationId);
  
  if (index === -1) return null;
  
  // If setting as default, remove default from other locations
  if (updates.isDefault) {
    locations.forEach(loc => loc.isDefault = false);
  }
  
  locations[index] = {
    ...locations[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveLocations(locations);
  return locations[index];
}

export function deleteLocation(locationId: string): boolean {
  const locations = getLocations();
  const location = locations.find(loc => loc.id === locationId);
  
  if (!location) return false;
  
  // Check if location has inventory
  const inventory = getLocationInventory();
  const hasInventory = inventory.some(inv => inv.locationId === locationId && inv.onHand > 0);
  
  if (hasInventory) {
    throw new Error("Cannot delete location with existing inventory. Please transfer or adjust stock to zero first.");
  }
  
  // If deleting default location, make another location default
  if (location.isDefault) {
    const remainingLocations = locations.filter(loc => loc.id !== locationId);
    if (remainingLocations.length > 0) {
      remainingLocations[0].isDefault = true;
    }
  }
  
  const filtered = locations.filter(loc => loc.id !== locationId);
  saveLocations(filtered);
  
  // Clean up inventory records for this location
  const updatedInventory = inventory.filter(inv => inv.locationId !== locationId);
  saveLocationInventory(updatedInventory);
  
  return true;
}

export function getDefaultLocation(): Location | null {
  const locations = getLocations();
  return locations.find(loc => loc.isDefault) || locations[0] || null;
}

// Location-aware Inventory Management
export function getLocationInventory(): LocationInventory[] {
  const stored = localStorage.getItem(INVENTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveLocationInventory(inventory: LocationInventory[]): void {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

export function getOrCreateInventory(productId: string, locationId: string): LocationInventory {
  const inventory = getLocationInventory();
  const existing = inventory.find(inv => inv.productId === productId && inv.locationId === locationId);
  
  if (existing) {
    return existing;
  }
  
  // Create new inventory record
  const newInventory: LocationInventory = {
    id: nanoid(),
    productId,
    locationId,
    onHand: 0,
    onOrder: 0,
    reorderPoint: 10,
    safetyStock: 5,
    reorderQty: 50,
    updatedAt: new Date().toISOString(),
  };
  
  inventory.push(newInventory);
  saveLocationInventory(inventory);
  return newInventory;
}

export function updateInventory(productId: string, locationId: string, updates: Partial<LocationInventory>): LocationInventory {
  const inventory = getLocationInventory();
  const index = inventory.findIndex(inv => inv.productId === productId && inv.locationId === locationId);
  
  if (index === -1) {
    // Create new if doesn't exist
    return getOrCreateInventory(productId, locationId);
  }
  
  inventory[index] = {
    ...inventory[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveLocationInventory(inventory);
  return inventory[index];
}

export function getInventoryByProduct(productId: string): LocationInventory[] {
  const inventory = getLocationInventory();
  return inventory.filter(inv => inv.productId === productId);
}

export function getInventoryByLocation(locationId: string): LocationInventory[] {
  const inventory = getLocationInventory();
  return inventory.filter(inv => inv.locationId === locationId);
}

// Stock Movement Management
export function getStockMoves(): StockMove[] {
  const stored = localStorage.getItem(MOVES_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveStockMoves(moves: StockMove[]): void {
  localStorage.setItem(MOVES_KEY, JSON.stringify(moves));
}

export function createStockMove(data: Omit<StockMove, 'id' | 'timestamp'>): StockMove {
  const moves = getStockMoves();
  
  const newMove: StockMove = {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  moves.push(newMove);
  saveStockMoves(moves);
  return newMove;
}

export function applyMove(move: Omit<StockMove, 'id' | 'timestamp'>): StockMove {
  const createdMove = createStockMove(move);
  const inventory = getLocationInventory();
  const settings = getInventorySettings();
  
  // Apply the move to inventory
  switch (move.type) {
    case "RECEIPT":
      if (move.toLocationId) {
        const inv = getOrCreateInventory(move.productId, move.toLocationId);
        updateInventory(move.productId, move.toLocationId, {
          onHand: inv.onHand + Math.abs(move.qty)
        });
      }
      break;
      
    case "ADJUST":
      if (move.toLocationId) {
        const inv = getOrCreateInventory(move.productId, move.toLocationId);
        const newOnHand = inv.onHand + move.qty;
        
        if (newOnHand < 0 && !settings.allowNegativeStock) {
          throw new Error(`Adjustment would result in negative stock (${newOnHand}). Current stock: ${inv.onHand}`);
        }
        
        updateInventory(move.productId, move.toLocationId, {
          onHand: Math.max(0, newOnHand)
        });
      }
      break;
      
    case "TRANSFER":
      if (move.fromLocationId && move.toLocationId) {
        // Validate source has enough stock
        const fromInv = getOrCreateInventory(move.productId, move.fromLocationId);
        if (fromInv.onHand < Math.abs(move.qty)) {
          throw new Error(`Insufficient stock for transfer. Available: ${fromInv.onHand}, Requested: ${Math.abs(move.qty)}`);
        }
        
        // Deduct from source
        updateInventory(move.productId, move.fromLocationId, {
          onHand: fromInv.onHand - Math.abs(move.qty)
        });
        
        // Add to destination
        const toInv = getOrCreateInventory(move.productId, move.toLocationId);
        updateInventory(move.productId, move.toLocationId, {
          onHand: toInv.onHand + Math.abs(move.qty)
        });
      }
      break;
      
    case "PICK":
      if (move.fromLocationId) {
        const inv = getOrCreateInventory(move.productId, move.fromLocationId);
        const newOnHand = inv.onHand - Math.abs(move.qty);
        
        if (newOnHand < 0 && !settings.allowNegativeStock) {
          throw new Error(`Pick would result in negative stock (${newOnHand}). Current stock: ${inv.onHand}`);
        }
        
        updateInventory(move.productId, move.fromLocationId, {
          onHand: Math.max(0, newOnHand)
        });
      }
      break;
      
    case "RETURN":
      if (move.toLocationId) {
        const inv = getOrCreateInventory(move.productId, move.toLocationId);
        updateInventory(move.productId, move.toLocationId, {
          onHand: inv.onHand + Math.abs(move.qty)
        });
      }
      break;
  }
  
  return createdMove;
}

// Stock Status Utilities
export function lowStockStatus(onHand: number, reorderPoint: number, safetyStock: number): StockStatus {
  if (onHand <= 0) return "OUT";
  if (onHand <= reorderPoint || onHand <= safetyStock) return "LOW";
  return "OK";
}

export function totalAcrossLocations(productId: string): number {
  const inventory = getInventoryByProduct(productId);
  return inventory.reduce((total, inv) => total + inv.onHand, 0);
}

export function getProductInventorySummary(productId: string): ProductInventorySummary {
  const inventory = getInventoryByProduct(productId);
  const locations = getLocations();
  
  const locationBreakdowns: LocationStockBreakdown[] = inventory.map(inv => {
    const location = locations.find(loc => loc.id === inv.locationId);
    return {
      locationId: inv.locationId,
      locationName: location?.name || 'Unknown Location',
      onHand: inv.onHand,
      reorderPoint: inv.reorderPoint,
      safetyStock: inv.safetyStock,
      status: lowStockStatus(inv.onHand, inv.reorderPoint, inv.safetyStock)
    };
  });
  
  const totalOnHand = inventory.reduce((sum, inv) => sum + inv.onHand, 0);
  
  // Overall status is worst status across all locations
  let overallStatus: StockStatus = "OK";
  if (locationBreakdowns.some(lb => lb.status === "OUT")) {
    overallStatus = "OUT";
  } else if (locationBreakdowns.some(lb => lb.status === "LOW")) {
    overallStatus = "LOW";
  }
  
  return {
    productId,
    totalOnHand,
    locations: locationBreakdowns,
    overallStatus
  };
}

// Transfer Operations
export function validateTransfer(request: TransferRequest): { valid: boolean; error?: string } {
  const { fromLocationId, toLocationId, productId, qty } = request;
  
  if (fromLocationId === toLocationId) {
    return { valid: false, error: "Source and destination locations must be different" };
  }
  
  if (qty <= 0) {
    return { valid: false, error: "Transfer quantity must be greater than 0" };
  }
  
  const fromLocation = getLocationById(fromLocationId);
  const toLocation = getLocationById(toLocationId);
  
  if (!fromLocation) {
    return { valid: false, error: "Source location not found" };
  }
  
  if (!toLocation) {
    return { valid: false, error: "Destination location not found" };
  }
  
  const inventory = getOrCreateInventory(productId, fromLocationId);
  if (inventory.onHand < qty) {
    return { valid: false, error: `Insufficient stock. Available: ${inventory.onHand}, Requested: ${qty}` };
  }
  
  return { valid: true };
}

export function executeTransfer(request: TransferRequest): { success: boolean; error?: string; moveId?: string } {
  const validation = validateTransfer(request);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const move = applyMove({
      type: "TRANSFER",
      productId: request.productId,
      fromLocationId: request.fromLocationId,
      toLocationId: request.toLocationId,
      qty: request.qty,
      refType: "TRANSFER",
      note: request.note,
    });
    
    return { success: true, moveId: move.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Transfer failed" };
  }
}

// Settings Management
export function getInventorySettings(): InventorySettings {
  const stored = localStorage.getItem(INVENTORY_SETTINGS_KEY);
  return stored ? JSON.parse(stored) : {
    combineLocations: false,
    allowNegativeStock: false,
    defaultLocationId: undefined,
  };
}

export function saveInventorySettings(settings: InventorySettings): void {
  localStorage.setItem(INVENTORY_SETTINGS_KEY, JSON.stringify(settings));
}

// Reporting Utilities
export function getTransferMoves(filters?: {
  productId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  startDate?: string;
  endDate?: string;
}): StockMove[] {
  const moves = getStockMoves();
  let filtered = moves.filter(move => move.type === "TRANSFER");
  
  if (filters) {
    if (filters.productId) {
      filtered = filtered.filter(move => move.productId === filters.productId);
    }
    if (filters.fromLocationId) {
      filtered = filtered.filter(move => move.fromLocationId === filters.fromLocationId);
    }
    if (filters.toLocationId) {
      filtered = filtered.filter(move => move.toLocationId === filters.toLocationId);
    }
    if (filters.startDate) {
      filtered = filtered.filter(move => move.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(move => move.timestamp <= filters.endDate!);
    }
  }
  
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getStockByLocationReport(): Array<{
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  onHand: number;
  reorderPoint: number;
  safetyStock: number;
  status: StockStatus;
}> {
  const inventory = getLocationInventory();
  const locations = getLocations();
  
  // Get product names from localStorage (assuming products are stored there)
  const productsData = localStorage.getItem('flowventory:products');
  const products = productsData ? JSON.parse(productsData) : [];
  
  return inventory.map(inv => {
    const location = locations.find(loc => loc.id === inv.locationId);
    const product = products.find((p: any) => p.id === inv.productId);
    
    return {
      productId: inv.productId,
      productName: product?.name || 'Unknown Product',
      locationId: inv.locationId,
      locationName: location?.name || 'Unknown Location',
      onHand: inv.onHand,
      reorderPoint: inv.reorderPoint,
      safetyStock: inv.safetyStock,
      status: lowStockStatus(inv.onHand, inv.reorderPoint, inv.safetyStock)
    };
  });
}

// CSV Export Utilities
export function exportStockByLocationCSV(): string {
  const data = getStockByLocationReport();
  const headers = ['Product ID', 'Product Name', 'Location ID', 'Location Name', 'On Hand', 'Reorder Point', 'Safety Stock', 'Status'];
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.productId,
      `"${row.productName}"`,
      row.locationId,
      `"${row.locationName}"`,
      row.onHand,
      row.reorderPoint,
      row.safetyStock,
      row.status
    ].join(','))
  ].join('\n');
  
  return csvContent;
}

export function exportTransferLogCSV(filters?: Parameters<typeof getTransferMoves>[0]): string {
  const moves = getTransferMoves(filters);
  const locations = getLocations();
  
  // Get product names
  const productsData = localStorage.getItem('flowventory:products');
  const products = productsData ? JSON.parse(productsData) : [];
  
  const headers = ['Date', 'Product ID', 'Product Name', 'From Location', 'To Location', 'Quantity', 'Reference', 'Note'];
  
  const csvContent = [
    headers.join(','),
    ...moves.map(move => {
      const product = products.find((p: any) => p.id === move.productId);
      const fromLocation = locations.find(loc => loc.id === move.fromLocationId);
      const toLocation = locations.find(loc => loc.id === move.toLocationId);
      
      return [
        new Date(move.timestamp).toISOString().split('T')[0],
        move.productId,
        `"${product?.name || 'Unknown Product'}"`,
        `"${fromLocation?.name || 'Unknown Location'}"`,
        `"${toLocation?.name || 'Unknown Location'}"`,
        move.qty,
        move.refId || '',
        `"${move.note || ''}"`
      ].join(',');
    })
  ].join('\n');
  
  return csvContent;
}

// Initialize default data
export function initializeWarehouseData(): void {
  const locations = getLocations();
  if (locations.length === 0) {
    // Create default locations
    createLocation({
      name: "London DC",
      regionId: "UK",
      type: "warehouse",
      isDefault: true,
      isActive: true,
    });
    
    createLocation({
      name: "Dubai DC",
      regionId: "UAE",
      type: "warehouse",
      isDefault: false,
      isActive: true,
    });
    
    createLocation({
      name: "NY Hub",
      regionId: "US",
      type: "warehouse",
      isDefault: false,
      isActive: true,
    });
  }
  
  // Initialize settings if not exists
  const settings = getInventorySettings();
  if (!localStorage.getItem(INVENTORY_SETTINGS_KEY)) {
    saveInventorySettings(settings);
  }
}