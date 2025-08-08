import { type User, type InsertUser, type OnboardingData, type InsertOnboardingData, type PlatformConnections, type Organization, type TeamInvitation, type InviteTeamMemberData, type UpdateTeamMemberData, type Notification, type CreateNotificationData, type Event, type InsertEvent, type Task, type InsertTask, type CreateEventData, type CreateTaskData, type UpdateTaskData, type PurchaseOrder, type InsertPurchaseOrder } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { notificationService } from "./notificationService";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnboarding(userId: string, complete: boolean): Promise<void>;
  updateUserPlatformConnections(userId: string, connections: PlatformConnections): Promise<void>;
  saveOnboardingData(userId: string, data: InsertOnboardingData): Promise<OnboardingData>;
  getOnboardingData(userId: string): Promise<OnboardingData | undefined>;
  
  // Team management methods
  createOrganization(name: string, createdBy: string): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getTeamMembers(organizationId: string): Promise<User[]>;
  inviteTeamMember(organizationId: string, invitedBy: string, memberData: InviteTeamMemberData): Promise<TeamInvitation>;
  updateTeamMemberRole(organizationId: string, memberData: UpdateTeamMemberData): Promise<User | undefined>;
  removeTeamMember(organizationId: string, userId: string): Promise<void>;
  getTeamInvitations(organizationId: string): Promise<TeamInvitation[]>;
  
  // Notification methods
  createNotification(organizationId: string, notificationData: CreateNotificationData): Promise<Notification>;
  getNotifications(organizationId: string, userId?: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  deleteExpiredNotifications(): Promise<void>;
  
  // Action Center Event methods
  createEvent(eventData: CreateEventData): Promise<{ event: Event, taskCreated?: Task }>;
  getEvents(filters?: { status?: string, type?: string, severity?: string, summary?: boolean }): Promise<Event[] | { events: Event[], summary: any }>;
  getEvent(id: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  
  // Action Center Task methods  
  createTask(taskData: CreateTaskData): Promise<Task>;
  createTaskFromEvent(eventId: string): Promise<Task | undefined>;
  getTasks(filters?: { status?: string, assigneeId?: string, type?: string, priority?: string, overdue?: boolean }): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  updateTask(id: string, updates: UpdateTaskData): Promise<Task | undefined>;
  resolveTask(id: string): Promise<{ task: Task, event: Event }>;
  getTaskByEventId(eventId: string): Promise<Task | undefined>;
  
  // Purchase Order methods
  createPurchaseOrder(poData: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrders(organizationId: string, filters?: { status?: string }): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<void>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingData: Map<string, OnboardingData>;
  private organizations: Map<string, Organization>;
  private teamInvitations: Map<string, TeamInvitation>;
  private notifications: Map<string, Notification>;
  private events: Map<string, Event>;
  private tasks: Map<string, Task>;
  private purchaseOrders: Map<string, PurchaseOrder>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.onboardingData = new Map();
    this.organizations = new Map();
    this.teamInvitations = new Map();
    this.notifications = new Map();
    this.events = new Map();
    this.tasks = new Map();
    this.purchaseOrders = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with some sample notifications
    this.initializeSampleNotifications();
    
    // Initialize with sample events and tasks
    this.initializeSampleActionCenterData();
  }

  private initializeSampleNotifications() {
    // Create sample organization if it doesn't exist
    const sampleOrgId = "sample-org-123";
    if (!this.organizations.has(sampleOrgId)) {
      this.organizations.set(sampleOrgId, {
        id: sampleOrgId,
        name: "Sample Organization",
        createdBy: "system",
        createdAt: new Date(),
      });
    }
  }

  // Add test alerts for a specific user on login/registration
  async addTestAlertsForUser(userId: string, organizationId: string = "sample-org-123"): Promise<void> {
    const testAlerts = [
      {
        id: `test-alert-1-${userId}`,
        organizationId,
        userId: null, // Organization-wide alerts
        type: "inventory_low" as const,
        title: "Low Stock Alert",
        message: "3 SKUs have stock below reorder level",
        icon: "AlertTriangle",
        priority: "high" as const,
        isRead: "false",
        readBy: {},
        metadata: { 
          productCount: 3, 
          products: ["SKU-001", "SKU-007", "SKU-012"],
          skus: ["Widget Pro", "Phone Case", "USB Cable"]
        },
        createdAt: new Date(),
        expiresAt: null,
      },
      {
        id: `test-alert-2-${userId}`,
        organizationId,
        userId: null,
        type: "api_connection_failed" as const,
        title: "Sync Failed",
        message: "Amazon sync failed – API key missing",
        icon: "WifiOff",
        priority: "critical" as const,
        isRead: "false",
        readBy: {},
        metadata: { 
          platform: "Amazon",
          error: "Invalid API credentials",
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        createdAt: new Date(),
        expiresAt: null,
      },
      {
        id: `test-alert-3-${userId}`,
        organizationId,
        userId: null,
        type: "no_upload" as const,
        title: "Data Upload Missing",
        message: "No CSV uploaded in 7 days",
        icon: "Upload",
        priority: "medium" as const,
        isRead: "false",
        readBy: {},
        metadata: { 
          lastUpload: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          daysSinceUpload: 7,
          expectedFrequency: "daily"
        },
        createdAt: new Date(),
        expiresAt: null,
      },
    ];

    // Clear any existing test alerts for this user first
    const keysToDelete: string[] = [];
    this.notifications.forEach((notification, id) => {
      if (id.includes(`test-alert-`) && id.includes(userId)) {
        keysToDelete.push(id);
      }
    });
    keysToDelete.forEach(id => this.notifications.delete(id));
    console.log(`Cleared ${keysToDelete.length} existing test alerts for user ${userId}`);

    // Add the new test alerts
    testAlerts.forEach(alert => {
      this.notifications.set(alert.id, alert);
    });
    
    console.log(`Added ${testAlerts.length} test alerts for user ${userId}`);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Create organization for admin users
    let organizationId: string | null = null;
    if (insertUser.role === "admin") {
      const org = await this.createOrganization(insertUser.companyName, insertUser.email);
      organizationId = org.id;
    }
    
    const user: User = { 
      ...insertUser, 
      id,
      username: insertUser.email, // Use email as username
      role: insertUser.role || "viewer", // Ensure role is defined
      organizationId,
      onboardingComplete: "false",
      platformConnections: {},
      invitedBy: null,
      joinedAt: new Date(),
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserOnboarding(userId: string, complete: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.onboardingComplete = complete ? "true" : "false";
      this.users.set(userId, user);
    }
  }

  async updateUserPlatformConnections(userId: string, connections: PlatformConnections): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.platformConnections = connections;
      this.users.set(userId, user);
    }
  }

  async saveOnboardingData(userId: string, data: InsertOnboardingData): Promise<OnboardingData> {
    const id = randomUUID();
    const onboarding: OnboardingData = {
      ...data,
      id,
      userId,
      createdAt: new Date(),
    };
    this.onboardingData.set(userId, onboarding);
    return onboarding;
  }

  async getOnboardingData(userId: string): Promise<OnboardingData | undefined> {
    return this.onboardingData.get(userId);
  }

  // Team management methods
  async createOrganization(name: string, createdBy: string): Promise<Organization> {
    const id = randomUUID();
    const organization: Organization = {
      id,
      name,
      createdBy,
      createdAt: new Date(),
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getTeamMembers(organizationId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === organizationId
    );
  }

  async inviteTeamMember(organizationId: string, invitedBy: string, memberData: InviteTeamMemberData): Promise<TeamInvitation> {
    const id = randomUUID();
    const invitation: TeamInvitation = {
      id,
      email: memberData.email,
      role: memberData.role,
      organizationId,
      invitedBy,
      status: "pending",
      createdAt: new Date(),
    };
    this.teamInvitations.set(id, invitation);
    
    // Simulate auto-accepting invitation by creating user
    const existingUser = await this.getUserByEmail(memberData.email);
    if (!existingUser) {
      const newUser: User = {
        id: randomUUID(),
        username: memberData.email,
        password: "temp-password-123", // In real app, would send email with setup link
        fullName: memberData.email.split('@')[0],
        email: memberData.email,
        companyName: "",
        role: memberData.role,
        organizationId,
        onboardingComplete: "false",
        platformConnections: {},
        invitedBy,
        joinedAt: new Date(),
        createdAt: new Date(),
      };
      this.users.set(newUser.id, newUser);
      
      // Mark invitation as accepted
      invitation.status = "accepted";
      this.teamInvitations.set(id, invitation);
    }
    
    return invitation;
  }

  async updateTeamMemberRole(organizationId: string, memberData: UpdateTeamMemberData): Promise<User | undefined> {
    const user = this.users.get(memberData.userId);
    if (user && user.organizationId === organizationId) {
      user.role = memberData.role;
      this.users.set(memberData.userId, user);
      return user;
    }
    return undefined;
  }

  async removeTeamMember(organizationId: string, userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user && user.organizationId === organizationId) {
      this.users.delete(userId);
    }
  }

  async getTeamInvitations(organizationId: string): Promise<TeamInvitation[]> {
    return Array.from(this.teamInvitations.values()).filter(
      (invitation) => invitation.organizationId === organizationId
    );
  }

  // Notification methods
  async createNotification(organizationId: string, notificationData: CreateNotificationData): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      organizationId,
      userId: notificationData.userId || null,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      icon: notificationData.icon,
      priority: notificationData.priority,
      isRead: "false",
      readBy: {},
      metadata: notificationData.metadata,
      createdAt: new Date(),
      expiresAt: notificationData.expiresAt ? new Date(notificationData.expiresAt) : null,
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  async getNotifications(organizationId: string, userId?: string): Promise<Notification[]> {
    const now = new Date();
    const allNotifications = Array.from(this.notifications.values());
    console.log(`Total notifications in system: ${allNotifications.length}`);
    console.log(`Looking for org: ${organizationId}, user: ${userId}`);
    
    const filtered = allNotifications.filter(notification => {
        console.log(`Checking notification: ${notification.id}, org: ${notification.organizationId}, userId: ${notification.userId}`);
        
        // Filter by organization
        if (notification.organizationId !== organizationId) {
          console.log(`Skipping - wrong org: ${notification.organizationId} vs ${organizationId}`);
          return false;
        }
        
        // Filter out expired notifications
        if (notification.expiresAt && notification.expiresAt < now) {
          console.log(`Skipping - expired: ${notification.expiresAt}`);
          return false;
        }
        
        // For organization-wide notifications or user-specific notifications
        if (notification.userId === null || notification.userId === userId) {
          // Show only unread notifications or notifications not read by this user
          if (userId && notification.readBy && typeof notification.readBy === 'object' && notification.readBy !== null) {
            const readByRecord = notification.readBy as Record<string, boolean>;
            if (readByRecord[userId]) {
              console.log(`Skipping - already read by user: ${userId}`);
              return false; // User has already read this notification
            }
          }
          console.log(`Including notification: ${notification.id}`);
          return true;
        }
        
        console.log(`Skipping - not for this user`);
        return false;
      })
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()); // Sort by newest first
    
    console.log(`Returning ${filtered.length} notifications for user ${userId}`);
    return filtered;
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      if (!notification.readBy || typeof notification.readBy !== 'object') {
        notification.readBy = {};
      }
      const readByRecord = notification.readBy as Record<string, boolean>;
      readByRecord[userId] = true;
      notification.readBy = readByRecord;
      this.notifications.set(notificationId, notification);
    }
  }

  async deleteExpiredNotifications(): Promise<void> {
    const now = new Date();
    const keysToDelete: string[] = [];
    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && notification.expiresAt < now) {
        keysToDelete.push(id);
      }
    });
    keysToDelete.forEach(id => this.notifications.delete(id));
  }

  // Action Center Event methods
  async createEvent(eventData: CreateEventData): Promise<{ event: Event, taskCreated?: Task }> {
    const id = randomUUID();
    const event: Event = {
      id,
      type: eventData.type,
      sku: eventData.sku || null,
      channel: eventData.channel || null,
      payload: eventData.payload,
      severity: eventData.severity,
      occurredAt: new Date(),
      status: "OPEN",
    };
    
    this.events.set(id, event);
    
    // Create a task for high severity events
    let taskCreated: Task | undefined;
    if (event.severity === "HIGH") {
      const taskTitle = this.generateTaskTitle(event);
      const taskType = this.getTaskTypeFromEvent(event.type);
      const taskData: CreateTaskData = {
        title: taskTitle,
        sourceEventId: event.id,
        type: taskType,
        priority: "P1",
      };
      taskCreated = await this.createTask(taskData);
    }
    
    return { event, taskCreated };
  }

  async getEvents(filters?: { status?: string, type?: string, severity?: string, summary?: boolean }): Promise<Event[] | { events: Event[], summary: any }> {
    let events = Array.from(this.events.values());
    
    if (filters) {
      if (filters.status) {
        events = events.filter(e => e.status === filters.status);
      }
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }
    }
    
    // Sort by occurred time (newest first)
    events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    
    if (filters?.summary) {
      const summary = {
        total: events.length,
        open: events.filter(e => e.status === "OPEN").length,
        handled: events.filter(e => e.status === "HANDLED").length,
        bySeverity: {
          LOW: events.filter(e => e.severity === "LOW").length,
          MEDIUM: events.filter(e => e.severity === "MEDIUM").length,
          HIGH: events.filter(e => e.severity === "HIGH").length,
        },
      };
      return { events, summary };
    }
    
    return events;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Action Center Task methods
  async createTask(taskData: CreateTaskData): Promise<Task> {
    const id = randomUUID();
    const now = new Date();
    const task: Task = {
      id,
      title: taskData.title,
      sourceEventId: taskData.sourceEventId || null,
      type: taskData.type,
      assigneeId: taskData.assigneeId || null,
      priority: taskData.priority,
      dueAt: taskData.dueAt ? new Date(taskData.dueAt) : null,
      status: "OPEN",
      notes: taskData.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.tasks.set(id, task);
    
    // Send notification for P1 tasks
    if (task.priority === "P1") {
      // Don't await to avoid blocking task creation
      notificationService.notifyP1Task(task).catch(error => {
        console.error("Failed to send P1 task notification:", error);
      });
    }
    
    return task;
  }

  async createTaskFromEvent(eventId: string): Promise<Task | undefined> {
    const event = await this.getEvent(eventId);
    if (!event) return undefined;
    
    const taskTitle = this.generateTaskTitle(event);
    const taskType = this.getTaskTypeFromEvent(event.type);
    
    return await this.createTask({
      title: taskTitle,
      sourceEventId: eventId,
      type: taskType,
      priority: event.severity === "HIGH" ? "P1" : "P2",
    });
  }

  async getTasks(filters?: { 
    status?: string; 
    assigneeId?: string; 
    type?: string; 
    priority?: string; 
    overdue?: boolean;
  }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filters) {
      if (filters.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters.assigneeId) {
        tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
      }
      if (filters.type) {
        tasks = tasks.filter(t => t.type === filters.type);
      }
      if (filters.priority) {
        tasks = tasks.filter(t => t.priority === filters.priority);
      }
      if (filters.overdue) {
        const now = new Date();
        tasks = tasks.filter(t => t.dueAt && t.dueAt < now && t.status !== "DONE");
      }
    }
    
    // Sort by priority and created time
    tasks.sort((a, b) => {
      const priorityOrder = { P1: 3, P2: 2, P3: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return tasks;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      ...updates,
      updatedAt: new Date(),
      dueAt: updates.dueAt ? new Date(updates.dueAt) : task.dueAt,
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async resolveTask(id: string): Promise<{ task: Task, event: Event }> {
    const task = await this.updateTask(id, { status: "DONE" });
    if (!task) throw new Error("Task not found");
    
    if (task.sourceEventId) {
      const event = await this.updateEvent(task.sourceEventId, { status: "HANDLED" });
      if (event) {
        return { task, event };
      }
    }
    
    throw new Error("Unable to resolve task - event not found");
  }

  async getTaskByEventId(eventId: string): Promise<Task | undefined> {
    for (const task of this.tasks.values()) {
      if (task.sourceEventId === eventId) {
        return task;
      }
    }
    return undefined;
  }

  // Helper methods for task generation
  private generateTaskTitle(event: Event): string {
    switch (event.type) {
      case "INVENTORY_LOW":
        return `Restock ${event.sku || "inventory"}`;
      case "SYNC_ERROR":
        return `Fix sync error for ${event.channel || "platform"}`;
      case "PAYMENT_MISMATCH":
        return `Reconcile payment discrepancy`;
      case "ROAS_DROP":
        return `Investigate ROAS drop for ${event.sku || "product"}`;
      default:
        return "Investigate issue";
    }
  }

  private getTaskTypeFromEvent(eventType: string): "RESTOCK" | "RETRY_SYNC" | "RECONCILE" | "ADJUST_BUDGET" {
    switch (eventType) {
      case "INVENTORY_LOW":
        return "RESTOCK";
      case "SYNC_ERROR":
        return "RETRY_SYNC";
      case "PAYMENT_MISMATCH":
        return "RECONCILE";
      case "ROAS_DROP":
        return "ADJUST_BUDGET";
      default:
        return "RETRY_SYNC";
    }
  }

  // Initialize sample events and tasks for testing
  private async initializeSampleActionCenterData() {
    // Sample events
    const sampleEvents = [
      {
        type: "INVENTORY_LOW",
        sku: "SKU-001",
        channel: null,
        payload: { currentStock: 5, reorderLevel: 20, velocity: 2.5 },
        severity: "HIGH" as const,
      },
      {
        type: "SYNC_ERROR",
        sku: null,
        channel: "Amazon",
        payload: { errorCode: "AUTH_FAILED", lastSync: "2025-01-07T10:00:00Z" },
        severity: "MEDIUM" as const,
      },
      {
        type: "PAYMENT_MISMATCH",
        sku: "SKU-002",
        channel: "Shopify",
        payload: { expectedAmount: 299.99, actualAmount: 289.99, orderId: "ORD-123" },
        severity: "HIGH" as const,
      }
    ];

    // Create events and auto-create tasks for high severity ones
    for (const eventData of sampleEvents) {
      await this.createEvent(eventData);
    }
  }

  // Purchase Order methods
  async createPurchaseOrder(poData: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const now = new Date();
    const po: PurchaseOrder = {
      id: randomUUID(),
      ...poData,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    
    this.purchaseOrders.set(po.id, po);
    return po;
  }

  async getPurchaseOrders(organizationId: string, filters?: { status?: string }): Promise<PurchaseOrder[]> {
    const allPOs = Array.from(this.purchaseOrders.values())
      .filter(po => po.organizationId === organizationId);

    if (filters?.status) {
      return allPOs.filter(po => po.status === filters.status);
    }

    return allPOs;
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    return this.purchaseOrders.get(id);
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const po = this.purchaseOrders.get(id);
    if (!po) return undefined;

    const updatedPO = {
      ...po,
      ...updates,
      updatedAt: new Date(),
    };

    this.purchaseOrders.set(id, updatedPO);
    return updatedPO;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    this.purchaseOrders.delete(id);
  }
}

export const storage = new MemStorage();
