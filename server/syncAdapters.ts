import { storage } from "./storage";

// Mock data for sync adapters
const MOCK_INVENTORY = [
  { sku: "SKU-001", stock: 5, dailySales: 2.5, threshold: 20 },
  { sku: "SKU-002", stock: 15, dailySales: 1.8, threshold: 25 },
  { sku: "SKU-003", stock: 3, dailySales: 0.8, threshold: 15 },
  { sku: "SKU-004", stock: 45, dailySales: 3.2, threshold: 30 },
  { sku: "SKU-005", stock: 8, dailySales: 2.1, threshold: 18 }
];

const MOCK_PAYOUTS = [
  { orderId: "AMZ-001", expectedAmount: 299.99, actualAmount: 289.99 },
  { orderId: "AMZ-002", expectedAmount: 149.50, actualAmount: 149.50 },
  { orderId: "AMZ-003", expectedAmount: 89.99, actualAmount: 79.99 },
  { orderId: "AMZ-004", expectedAmount: 199.00, actualAmount: 199.00 }
];

const MOCK_ROAS_DATA = {
  today: Math.random() * 100 + 50, // Random ROAS between 50-150%
  yesterday: Math.random() * 100 + 100 // Random ROAS between 100-200%
};

interface SyncStatus {
  adapter: string;
  lastSyncAt: string | null;
  status: "success" | "error" | "never";
  lastError?: string | null;
}

class SyncManager {
  private syncStatuses: Map<string, SyncStatus> = new Map();

  constructor() {
    // Initialize sync statuses
    this.syncStatuses.set("shopify", {
      adapter: "shopify",
      lastSyncAt: null,
      status: "never"
    });
    this.syncStatuses.set("amazon", {
      adapter: "amazon", 
      lastSyncAt: null,
      status: "never"
    });
    this.syncStatuses.set("meta", {
      adapter: "meta",
      lastSyncAt: null,
      status: "never"
    });
  }

  async syncShopify(): Promise<{ syncedAt: string; createdEvents: number }> {
    const syncedAt = new Date().toISOString();
    let createdEvents = 0;

    try {
      // Process inventory data
      for (const item of MOCK_INVENTORY) {
        const daysCover = item.stock / (item.dailySales || Math.random() * 2.5 + 0.5);
        
        if (item.stock <= item.threshold) {
          // Create INVENTORY_LOW event
          await storage.createEvent({
            type: "INVENTORY_LOW",
            sku: item.sku,
            channel: "Shopify",
            payload: {
              currentStock: item.stock,
              reorderLevel: item.threshold,
              velocity: item.dailySales,
              daysCover: Math.round(daysCover * 10) / 10
            },
            severity: item.stock <= item.threshold * 0.5 ? "HIGH" : "MEDIUM"
          });
          createdEvents++;
        }
      }

      // Update sync status
      this.syncStatuses.set("shopify", {
        adapter: "shopify",
        lastSyncAt: syncedAt,
        status: "success"
      });

      return { syncedAt, createdEvents };
    } catch (error) {
      this.syncStatuses.set("shopify", {
        adapter: "shopify",
        lastSyncAt: syncedAt,
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }

  async syncAmazon(): Promise<{ syncedAt: string; createdEvents: number }> {
    const syncedAt = new Date().toISOString();
    let createdEvents = 0;

    try {
      // Process payout data
      const mismatches = MOCK_PAYOUTS.filter(payout => 
        Math.abs(payout.expectedAmount - payout.actualAmount) > 0.01
      );

      for (const mismatch of mismatches) {
        const delta = mismatch.actualAmount - mismatch.expectedAmount;
        
        await storage.createEvent({
          type: "PAYMENT_MISMATCH",
          sku: undefined,
          channel: "Amazon",
          payload: {
            orderId: mismatch.orderId,
            expectedAmount: mismatch.expectedAmount,
            actualAmount: mismatch.actualAmount,
            delta: Math.round(delta * 100) / 100
          },
          severity: Math.abs(delta) > 50 ? "HIGH" : "MEDIUM"
        });
        createdEvents++;
      }

      // Update sync status
      this.syncStatuses.set("amazon", {
        adapter: "amazon",
        lastSyncAt: syncedAt,
        status: "success"
      });

      return { syncedAt, createdEvents };
    } catch (error) {
      this.syncStatuses.set("amazon", {
        adapter: "amazon",
        lastSyncAt: syncedAt,
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }

  async syncMeta(): Promise<{ syncedAt: string; createdEvents: number }> {
    const syncedAt = new Date().toISOString();
    let createdEvents = 0;

    try {
      // Calculate ROAS drop percentage
      const todayROAS = MOCK_ROAS_DATA.today;
      const yesterdayROAS = MOCK_ROAS_DATA.yesterday;
      const dropPct = ((yesterdayROAS - todayROAS) / yesterdayROAS) * 100;

      if (dropPct >= 40) {
        await storage.createEvent({
          type: "ROAS_DROP", 
          sku: undefined,
          channel: "Meta",
          payload: {
            currentROAS: Math.round(todayROAS * 100) / 100,
            previousROAS: Math.round(yesterdayROAS * 100) / 100,
            dropPercent: Math.round(dropPct * 100) / 100,
            threshold: 40
          },
          severity: dropPct >= 60 ? "HIGH" : "MEDIUM"
        });
        createdEvents++;
      }

      // Update sync status
      this.syncStatuses.set("meta", {
        adapter: "meta",
        lastSyncAt: syncedAt,
        status: "success"
      });

      return { syncedAt, createdEvents };
    } catch (error) {
      this.syncStatuses.set("meta", {
        adapter: "meta",
        lastSyncAt: syncedAt,
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }

  getSyncStatus(adapter?: string): SyncStatus | SyncStatus[] {
    if (adapter) {
      return this.syncStatuses.get(adapter) || {
        adapter,
        lastSyncAt: null,
        status: "never" as const,
        lastError: null
      };
    }
    return Array.from(this.syncStatuses.values());
  }

  // Auto-sync functionality (optional cron)
  startAutoSync(intervalMinutes: number = 30) {
    const interval = intervalMinutes * 60 * 1000; // Convert to milliseconds
    
    setInterval(async () => {
      console.log("Running automated sync...");
      
      try {
        await Promise.allSettled([
          this.syncShopify(),
          this.syncAmazon(), 
          this.syncMeta()
        ]);
        console.log("Automated sync completed");
      } catch (error) {
        console.error("Automated sync error:", error);
      }
    }, interval);
    
    console.log(`Automated sync started - running every ${intervalMinutes} minutes`);
  }
}

export const syncManager = new SyncManager();