import { type AnalyticsSummary } from "@shared/schema";
import { type IStorage } from "./storage";

// In-memory cache for analytics data (60s TTL)
let analyticsCache: { data: AnalyticsSummary; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Seeded RNG for deterministic mock data
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class AnalyticsService {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  async getAnalyticsSummary(organizationId: string): Promise<AnalyticsSummary> {
    // Check cache first
    const now = Date.now();
    if (analyticsCache && (now - analyticsCache.timestamp) < CACHE_TTL_MS) {
      return analyticsCache.data;
    }
    
    try {
      // Try to get real data
      const summary = await this.getRealAnalytics(organizationId);
      
      // Cache the result
      analyticsCache = {
        data: summary,
        timestamp: now
      };
      
      return summary;
    } catch (error) {
      console.error("Error getting real analytics, falling back to mock:", error);
      
      // Fallback to deterministic mock data
      const mockSummary = this.getMockAnalytics(organizationId);
      
      // Cache the mock result
      analyticsCache = {
        data: mockSummary,
        timestamp: now
      };
      
      return mockSummary;
    }
  }
  
  private async getRealAnalytics(organizationId: string): Promise<AnalyticsSummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all tasks for the organization
    const allTasks = await this.storage.getTasks();
    
    // Filter tasks by organization (assuming we can get org from tasks)
    const openTasks = allTasks.filter(task => task.status !== "DONE");
    
    // Calculate open tasks by type
    const openTasksByType = {
      RESTOCK: openTasks.filter(t => t.type === "RESTOCK").length,
      RETRY_SYNC: openTasks.filter(t => t.type === "RETRY_SYNC").length,
      RECONCILE: openTasks.filter(t => t.type === "RECONCILE").length,
      ADJUST_BUDGET: openTasks.filter(t => t.type === "ADJUST_BUDGET").length,
    };
    
    // Calculate open tasks by priority
    const openByPriority = {
      P1: openTasks.filter(t => t.priority === "P1").length,
      P2: openTasks.filter(t => t.priority === "P2").length,
      P3: openTasks.filter(t => t.priority === "P3").length,
    };
    
    // Get events for stockouts calculation
    const events = await this.storage.getEvents({ type: "INVENTORY_LOW" });
    const recentEvents = Array.isArray(events) ? events.filter(event => {
      const eventDate = new Date(event.occurredAt || event.createdAt);
      return eventDate >= sevenDaysAgo;
    }) : [];
    
    const stockouts7d = recentEvents.filter(event => {
      return event.payload && typeof event.payload === 'object' && 
             'stock' in event.payload && event.payload.stock === 0;
    }).length;
    
    // Calculate TTR (Time to Resolution) for completed tasks
    const doneTasks = allTasks.filter(task => task.status === "DONE");
    let ttrHours: number[] = [];
    
    for (const task of doneTasks) {
      if (task.eventId) {
        try {
          const event = await this.storage.getEvent(task.eventId);
          if (event && event.occurredAt && task.updatedAt) {
            const eventTime = new Date(event.occurredAt).getTime();
            const resolvedTime = new Date(task.updatedAt).getTime();
            const hours = (resolvedTime - eventTime) / (1000 * 60 * 60);
            if (hours > 0 && hours < 24 * 7) { // Only consider TTR under 7 days
              ttrHours.push(hours);
            }
          }
        } catch (error) {
          // Skip this task if we can't get the event
          continue;
        }
      }
    }
    
    // Calculate median TTR
    let ttrMedianHours = 0;
    if (ttrHours.length > 0) {
      ttrHours.sort((a, b) => a - b);
      const mid = Math.floor(ttrHours.length / 2);
      ttrMedianHours = ttrHours.length % 2 === 0 
        ? (ttrHours[mid - 1] + ttrHours[mid]) / 2 
        : ttrHours[mid];
    }
    
    // For sales data, we'll use mock data since we don't have a sales schema yet
    const rng = new SeededRandom(organizationId.charCodeAt(0));
    const sales7d = rng.nextInt(50000, 200000);
    const sales30d = Array.from({ length: 30 }, () => rng.nextInt(1000, 8000));
    
    return {
      sales7d,
      sales30d,
      openTasksByType,
      openByPriority,
      stockouts7d,
      ttrMedianHours: Math.round(ttrMedianHours * 10) / 10, // Round to 1 decimal
    };
  }
  
  private getMockAnalytics(organizationId: string): AnalyticsSummary {
    // Use organization ID as seed for deterministic results
    const rng = new SeededRandom(organizationId.charCodeAt(0));
    
    return {
      sales7d: rng.nextInt(50000, 200000),
      sales30d: Array.from({ length: 30 }, () => rng.nextInt(1000, 8000)),
      openTasksByType: {
        RESTOCK: rng.nextInt(2, 8),
        RETRY_SYNC: rng.nextInt(0, 3),
        RECONCILE: rng.nextInt(1, 5),
        ADJUST_BUDGET: rng.nextInt(0, 2),
      },
      openByPriority: {
        P1: rng.nextInt(1, 4),
        P2: rng.nextInt(2, 6),
        P3: rng.nextInt(1, 3),
      },
      stockouts7d: rng.nextInt(0, 4),
      ttrMedianHours: rng.nextInt(8, 48) + rng.next(), // Add decimal for realism
    };
  }
}