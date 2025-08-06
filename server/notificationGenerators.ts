import { storage } from "./storage";
import type { CreateNotificationData } from "@shared/schema";

export class NotificationGenerators {
  private static organizationId = "sample-org-123"; // In real app, this would be dynamic

  // Check for low inventory and generate alerts
  static async checkInventoryLevels() {
    try {
      // Simulate inventory check logic
      const lowStockProducts = [
        { sku: "SKU-001", name: "Wireless Headphones", currentStock: 2, reorderLevel: 10 },
        { sku: "SKU-007", name: "Phone Case", currentStock: 1, reorderLevel: 15 },
        { sku: "SKU-012", name: "Charging Cable", currentStock: 3, reorderLevel: 20 },
      ];

      if (lowStockProducts.length > 0) {
        const notification: CreateNotificationData = {
          type: "inventory_low",
          title: "Low Inventory Alert",
          message: `${lowStockProducts.length} products are below reorder level`,
          icon: "AlertTriangle",
          priority: "high",
          metadata: {
            productCount: lowStockProducts.length,
            products: lowStockProducts.map(p => p.sku),
            details: lowStockProducts,
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated low inventory alert for ${lowStockProducts.length} products`);
      }
    } catch (error) {
      console.error("Error checking inventory levels:", error);
    }
  }

  // Check API connections and generate failure alerts
  static async checkAPIConnections() {
    try {
      // Simulate API connection checks
      const connections = [
        { name: "Shopify", status: "failed", lastSync: new Date(Date.now() - 30 * 60 * 1000) },
        { name: "Amazon", status: "connected", lastSync: new Date() },
        { name: "eBay", status: "connected", lastSync: new Date() },
      ];

      const failedConnections = connections.filter(conn => conn.status === "failed");

      for (const connection of failedConnections) {
        const notification: CreateNotificationData = {
          type: "api_connection_failed",
          title: "API Connection Failed",
          message: `${connection.name} connection lost - data sync interrupted`,
          icon: "WifiOff",
          priority: "critical",
          metadata: {
            platform: connection.name,
            lastSync: connection.lastSync,
            error: "Connection timeout",
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated API failure alert for ${connection.name}`);
      }
    } catch (error) {
      console.error("Error checking API connections:", error);
    }
  }

  // Check for uploads and generate no-upload alerts
  static async checkDataUploads() {
    try {
      // Simulate checking last upload time
      const lastUploadTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const daysSinceUpload = Math.floor((Date.now() - lastUploadTime.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceUpload >= 7) {
        const notification: CreateNotificationData = {
          type: "no_upload",
          title: "No Data Upload",
          message: `No inventory data uploaded in last ${daysSinceUpload} days`,
          icon: "Upload",
          priority: "medium",
          metadata: {
            lastUpload: lastUploadTime,
            daysSinceUpload,
            expectedFrequency: "daily",
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated no-upload alert - ${daysSinceUpload} days since last upload`);
      }
    } catch (error) {
      console.error("Error checking data uploads:", error);
    }
  }

  // Generate team update notifications
  static async generateTeamUpdate(message: string, metadata: any = {}) {
    try {
      const notification: CreateNotificationData = {
        type: "team_update",
        title: "Team Update",
        message,
        icon: "Users",
        priority: "medium",
        metadata,
      };

      await storage.createNotification(this.organizationId, notification);
      console.log("Generated team update notification");
    } catch (error) {
      console.error("Error generating team update:", error);
    }
  }

  // Generate system notifications
  static async generateSystemNotification(title: string, message: string, priority: "low" | "medium" | "high" | "critical" = "medium", metadata: any = {}) {
    try {
      const notification: CreateNotificationData = {
        type: "system",
        title,
        message,
        icon: "Settings",
        priority,
        metadata,
      };

      await storage.createNotification(this.organizationId, notification);
      console.log(`Generated system notification: ${title}`);
    } catch (error) {
      console.error("Error generating system notification:", error);
    }
  }

  // Run all periodic checks
  static async runPeriodicChecks() {
    console.log("Running periodic notification checks...");
    await Promise.all([
      this.checkInventoryLevels(),
      this.checkAPIConnections(),
      this.checkDataUploads(),
    ]);
    console.log("Periodic notification checks completed");
  }

  // Initialize periodic checks (in real app, would use cron job or scheduler)
  static startPeriodicChecks(intervalMinutes: number = 30) {
    // Run immediately
    this.runPeriodicChecks();
    
    // Schedule periodic runs
    setInterval(() => {
      this.runPeriodicChecks();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Started periodic notification checks every ${intervalMinutes} minutes`);
  }
}