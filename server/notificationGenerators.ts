import { storage } from "./storage";
import type { CreateNotificationData } from "@shared/schema";
import { getAllProducts } from "../client/src/data/seedProductData";
import { getForecastForHorizon, calcSuggestion } from "../client/src/utils/forecasting";
import { getSalesOrders } from "../client/src/utils/forecastStorage";

export class NotificationGenerators {
  private static organizationId = "sample-org-123"; // In real app, this would be dynamic

  // Check for low inventory and generate alerts with forecast insights
  static async checkInventoryLevels() {
    try {
      const products = getAllProducts();
      const salesOrders = getSalesOrders();
      
      const lowStockProducts = [];
      const predictedStockouts = [];
      const reorderSuggestions = [];

      for (const product of products) {
        const currentStock = product.stock || 0;
        
        // Get forecast data for this product
        const forecastData = getForecastForHorizon(
          salesOrders,
          product.id,
          undefined, // All locations
          "30",
          "moving_avg"
        );

        // Calculate reorder suggestion
        const suggestion = calcSuggestion({
          onHand: currentStock,
          safetyStock: 50,
          avgDaily: forecastData.avgDaily,
          leadTimeDays: 14,
          reorderQty: 100
        });

        const daysLeft = forecastData.avgDaily > 0 ? Math.floor(currentStock / forecastData.avgDaily) : 999;
        
        // Traditional low stock check
        if (daysLeft < 7) {
          lowStockProducts.push({
            sku: product.sku,
            name: product.name,
            currentStock,
            daysLeft,
            avgDailySales: forecastData.avgDaily
          });
        }

        // Forecast-based stockout prediction (within 14 days)
        if (daysLeft < 14 && daysLeft > 0) {
          predictedStockouts.push({
            sku: product.sku,
            name: product.name,
            currentStock,
            daysLeft,
            predictedStockoutDate: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000),
            forecastDemand: forecastData.daily.slice(0, 14).reduce((sum, day) => sum + day.qty, 0)
          });
        }

        // Reorder suggestions
        if (suggestion.suggestedQty > 0) {
          reorderSuggestions.push({
            sku: product.sku,
            name: product.name,
            currentStock,
            suggestedQty: suggestion.suggestedQty,
            nextReorderDate: suggestion.nextReorderDate,
            avgDailySales: forecastData.avgDaily
          });
        }
      }

      // Generate traditional low stock alerts
      if (lowStockProducts.length > 0) {
        const notification: CreateNotificationData = {
          type: "inventory_low",
          title: "Critical Low Inventory Alert",
          message: `${lowStockProducts.length} products are critically low (< 7 days stock)`,
          icon: "AlertTriangle",
          priority: "critical",
          metadata: {
            productCount: lowStockProducts.length,
            products: lowStockProducts.map(p => p.sku),
            details: lowStockProducts,
            forecastBased: true
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated forecast-enhanced low inventory alert for ${lowStockProducts.length} products`);
      }

      // Generate predicted stockout alerts
      if (predictedStockouts.length > 0) {
        const notification: CreateNotificationData = {
          type: "predicted_stockout",
          title: "Predicted Stockout Alert",
          message: `${predictedStockouts.length} products predicted to stock out within 14 days`,
          icon: "TrendingDown",
          priority: "high",
          metadata: {
            productCount: predictedStockouts.length,
            products: predictedStockouts.map(p => p.sku),
            details: predictedStockouts,
            forecastHorizon: "14 days"
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated predicted stockout alert for ${predictedStockouts.length} products`);
      }

      // Generate reorder recommendation alerts
      if (reorderSuggestions.length > 0) {
        const totalSuggestedUnits = reorderSuggestions.reduce((sum, item) => sum + item.suggestedQty, 0);
        
        const notification: CreateNotificationData = {
          type: "reorder_recommendation",
          title: "AI Reorder Recommendations",
          message: `${reorderSuggestions.length} products recommended for reorder (${totalSuggestedUnits} total units)`,
          icon: "ShoppingCart",
          priority: "medium",
          metadata: {
            productCount: reorderSuggestions.length,
            totalUnits: totalSuggestedUnits,
            products: reorderSuggestions.map(p => p.sku),
            details: reorderSuggestions,
            aiGenerated: true
          },
        };

        await storage.createNotification(this.organizationId, notification);
        console.log(`Generated AI reorder recommendations for ${reorderSuggestions.length} products (${totalSuggestedUnits} units)`);
      }

    } catch (error) {
      console.error("Error checking inventory levels with forecast data:", error);
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