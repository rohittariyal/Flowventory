import { type User, type InsertUser, type OnboardingData, type InsertOnboardingData, type PlatformConnections, type Organization, type TeamInvitation, type InviteTeamMemberData, type UpdateTeamMemberData, type Notification, type CreateNotificationData, type Event, type InsertEvent, type Task, type InsertTask, type CreateEventData, type CreateTaskData, type UpdateTaskData, type PurchaseOrder, type InsertPurchaseOrder, type Comment, type InsertComment, type Activity, type InsertActivity, type Rule, type InsertRule, type CreateCommentData, type CreateRuleData, type ReconBatch, type InsertReconBatch, type ReconRow, type InsertReconRow, type ReconIngestData, type UpdateReconRowData, type Supplier, type InsertSupplier, type SupplierDelivery, type InsertSupplierDelivery, type ReorderPolicy, type InsertReorderPolicy, type ReorderSuggestData, type UpdatePurchaseOrderStatusData, type SimplePurchaseOrder, type InsertSimplePurchaseOrder, type WorkspaceSettings, type InsertWorkspaceSettings, type Region, type InsertRegion, type NotificationSettings, type InsertNotificationSettings, type Customer, type InsertCustomer, type UpdateCustomer, type SalesOrder, type InsertSalesOrder, type UpdateSalesOrder } from "@shared/schema";

// Temporary placeholder types until schema is updated
type ShippingConnector = {
  id: string;
  organizationId: string;
  provider: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  encryptedCredentials: string;
  config: Record<string, any>;
  lastTestAt: Date | null;
  lastTestStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type InsertShippingConnector = Omit<ShippingConnector, 'id' | 'createdAt' | 'updatedAt'>;

type Shipment = {
  id: string;
  organizationId: string;
  connectorId: string;
  salesOrderId: string | null;
  provider: string;
  providerShipmentId: string;
  trackingNumber: string | null;
  status: 'created' | 'in_transit' | 'delivered' | 'exception' | 'cancelled';
  fromAddress: Record<string, any>;
  toAddress: Record<string, any>;
  packageInfo: Record<string, any>;
  cost: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

type InsertShipment = Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>;
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

  // Task Collaboration methods
  createComment(taskId: string, authorId: string, commentData: CreateCommentData): Promise<Comment>;
  getTaskComments(taskId: string): Promise<Comment[]>;
  getTaskActivity(taskId: string): Promise<Activity[]>;
  createActivity(activityData: InsertActivity): Promise<Activity>;

  // Rules methods
  getRules(): Promise<Rule[]>;
  createRule(ruleData: CreateRuleData): Promise<Rule>;
  deleteRule(id: string): Promise<boolean>;
  findMatchingRule(taskType: string): Promise<Rule | undefined>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<void>;

  // Reconciliation methods
  createReconBatch(batchData: InsertReconBatch): Promise<ReconBatch>;
  createReconRow(rowData: InsertReconRow): Promise<ReconRow>;
  getReconBatches(filters?: { region?: string, source?: string, limit?: number, offset?: number }): Promise<ReconBatch[]>;
  getReconBatch(id: string): Promise<ReconBatch | undefined>;

  // Restock Autopilot - Supplier methods
  createSupplier(supplierData: InsertSupplier): Promise<Supplier>;
  getSuppliers(workspaceId: string, filters?: { sku?: string }): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<void>;

  // Restock Autopilot - Reorder Policy methods
  createReorderPolicy(policyData: InsertReorderPolicy): Promise<ReorderPolicy>;
  getReorderPolicy(workspaceId: string, sku: string): Promise<ReorderPolicy | undefined>;
  updateReorderPolicy(workspaceId: string, sku: string, updates: Partial<ReorderPolicy>): Promise<ReorderPolicy | undefined>;
  getReconRows(batchId: string, filters?: { status?: string, hasDiff?: boolean, limit?: number, offset?: number }): Promise<ReconRow[]>;
  getReconRow(id: string): Promise<ReconRow | undefined>;
  updateReconRow(id: string, updates: UpdateReconRowData): Promise<ReconRow | undefined>;
  updateReconBatch(id: string, updates: Partial<ReconBatch>): Promise<ReconBatch | undefined>;
  updateReconBatchTotals(batchId: string, totals: { expectedBaseTotal: number, paidBaseTotal: number, diffBaseTotal: number, ordersTotal: number, mismatchedCount: number }): Promise<void>;
  
  // Simple Purchase Order methods
  createSimplePurchaseOrder(poData: InsertSimplePurchaseOrder): Promise<SimplePurchaseOrder>;
  getSimplePurchaseOrders(): Promise<SimplePurchaseOrder[]>;
  updateSimplePurchaseOrderStatus(id: string, status: string): Promise<SimplePurchaseOrder | undefined>;
  
  // Workspace Settings methods
  getWorkspaceSettings(organizationId: string): Promise<WorkspaceSettings | undefined>;
  updateWorkspaceSettings(organizationId: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
  createWorkspaceSettings(organizationId: string, settings: InsertWorkspaceSettings): Promise<WorkspaceSettings>;
  
  // Regions methods
  getRegions(organizationId: string): Promise<Region[]>;
  createRegion(organizationId: string, regionData: any): Promise<Region>;
  updateRegion(regionId: string, updates: any): Promise<Region>;
  deleteRegion(regionId: string): Promise<void>;
  
  // Notification Settings methods
  getNotificationSettings(organizationId: string): Promise<NotificationSettings | undefined>;
  updateNotificationSettings(organizationId: string, updates: any): Promise<NotificationSettings>;
  createNotificationSettings(organizationId: string, settings: any): Promise<NotificationSettings>;
  
  // SLA Tracking methods
  createSupplierDelivery(deliveryData: InsertSupplierDelivery): Promise<SupplierDelivery>;
  updateSupplierDelivery(id: string, updates: Partial<SupplierDelivery>): Promise<SupplierDelivery | undefined>;
  getSupplierDeliveries(supplierId: string): Promise<SupplierDelivery[]>;
  calculateSupplierSLAMetrics(supplierId: string): Promise<{ onTimeRatePct: number, defectRatePct: number, avgLeadTimeDays: number, breachCount: number, totalDeliveries: number }>;
  updateSupplierSLAMetrics(supplierId: string): Promise<void>;
  getSuppliersWithSLABreaches(workspaceId: string): Promise<Supplier[]>;
  getSupplierSLAMetrics(workspaceId: string): Promise<{ suppliers: any[], global: any }>;
  
  // Customer methods
  createCustomer(customerData: InsertCustomer): Promise<Customer>;
  getCustomers(workspaceId: string, filters?: { search?: string, company?: string }): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  updateCustomer(id: string, updates: UpdateCustomer): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;
  getCustomerOrders(customerId: string): Promise<SalesOrder[]>;
  
  // Sales Order methods
  createSalesOrder(orderData: InsertSalesOrder): Promise<SalesOrder>;
  getSalesOrders(workspaceId: string, filters?: { customerId?: string, status?: string }): Promise<SalesOrder[]>;
  getSalesOrder(id: string): Promise<SalesOrder | undefined>;
  updateSalesOrder(id: string, updates: UpdateSalesOrder): Promise<SalesOrder | undefined>;
  deleteSalesOrder(id: string): Promise<void>;
  
  // Shipping Connector methods
  createShippingConnector(connectorData: InsertShippingConnector): Promise<ShippingConnector>;
  getShippingConnectors(organizationId: string): Promise<ShippingConnector[]>;
  getShippingConnector(id: string): Promise<ShippingConnector | undefined>;
  updateShippingConnector(id: string, updates: Partial<ShippingConnector>): Promise<ShippingConnector | undefined>;
  deleteShippingConnector(id: string): Promise<void>;
  testShippingConnector(id: string): Promise<{ success: boolean; error?: string }>;
  
  // Shipment methods
  createShipment(shipmentData: InsertShipment): Promise<Shipment>;
  getShipments(organizationId: string, filters?: { connectorId?: string, orderId?: string, status?: string }): Promise<Shipment[]>;
  getShipment(id: string): Promise<Shipment | undefined>;
  updateShipment(id: string, updates: Partial<Shipment>): Promise<Shipment | undefined>;
  
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
  private comments: Map<string, Comment>;
  private activities: Map<string, Activity>;
  private rules: Map<string, Rule>;
  private reconBatches: Map<string, ReconBatch>;
  private reconRows: Map<string, ReconRow>;
  private suppliers: Map<string, Supplier>;
  private supplierDeliveries: Map<string, SupplierDelivery>;
  private reorderPolicies: Map<string, ReorderPolicy>;
  private simplePurchaseOrders: Map<string, SimplePurchaseOrder>;
  private workspaceSettings: Map<string, WorkspaceSettings>;
  private regions: Map<string, Region>;
  private notificationSettings: Map<string, NotificationSettings>;
  private customers: Map<string, Customer>;
  private salesOrders: Map<string, SalesOrder>;
  private shippingConnectors: Map<string, ShippingConnector>;
  private shipments: Map<string, Shipment>;
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
    this.comments = new Map();
    this.activities = new Map();
    this.rules = new Map();
    this.reconBatches = new Map();
    this.reconRows = new Map();
    this.suppliers = new Map();
    this.supplierDeliveries = new Map();
    this.reorderPolicies = new Map();
    this.simplePurchaseOrders = new Map();
    this.workspaceSettings = new Map();
    this.regions = new Map();
    this.notificationSettings = new Map();
    this.customers = new Map();
    this.salesOrders = new Map();
    this.shippingConnectors = new Map();
    this.shipments = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with some sample notifications
    this.initializeSampleNotifications();
    
    // Initialize with sample events and tasks
    this.initializeSampleActionCenterData();
    
    // Initialize sample rules
    this.initializeSampleRules();
    
    // Initialize test regions with UAE fixture
    this.initializeTestRegions();
    
    // Initialize sample suppliers for testing
    this.initializeSampleSuppliers();
    
    // Initialize sample customers for testing
    this.initializeSampleCustomers();
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

  private initializeTestRegions() {
    const testOrgId = "test-org-id";
    
    // Create test UAE region fixture
    const uaeRegion: Region = {
      id: "uae-region-001",
      organizationId: testOrgId,
      name: "United Arab Emirates",
      currency: "AED",
      timezone: "Asia/Dubai",
      slaDays: 2, // 48 hours = 2 days
      restockBufferPct: 25,
      isActive: "true",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.regions.set(uaeRegion.id, uaeRegion);
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
      baseCurrency: "USD",
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
        baseCurrency: "USD",
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
    events.sort((a, b) => (b.occurredAt?.getTime() || 0) - (a.occurredAt?.getTime() || 0));
    
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
    
    // Apply matching rule if exists
    const matchingRule = await this.findMatchingRule(taskData.type);
    let finalAssigneeId = taskData.assigneeId;
    let finalPriority = taskData.priority;
    let finalDueAt = taskData.dueAt ? new Date(taskData.dueAt) : null;

    if (matchingRule) {
      // Apply rule overrides
      if (!finalAssigneeId && matchingRule.assigneeId) {
        finalAssigneeId = matchingRule.assigneeId;
      }
      if (!taskData.priority && matchingRule.priority) {
        finalPriority = matchingRule.priority;
      }
      if (!finalDueAt && matchingRule.dueOffsetHours) {
        finalDueAt = new Date(now.getTime() + matchingRule.dueOffsetHours * 60 * 60 * 1000);
      }
    }
    
    // Calculate default due dates if no rule applied and no dueAt provided
    if (!finalDueAt) {
      switch (taskData.type) {
        case "RESTOCK":
          finalDueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
          break;
        case "RETRY_SYNC":
          finalDueAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
          break;
        case "RECONCILE":
          finalDueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 hours
          break;
        case "ADJUST_BUDGET":
          finalDueAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72 hours
          break;
      }
    }
    
    const task: Task = {
      id,
      title: taskData.title,
      sourceEventId: taskData.sourceEventId || null,
      type: taskData.type,
      assigneeId: finalAssigneeId || null,
      priority: finalPriority || "P3",
      dueAt: finalDueAt,
      status: "OPEN",
      notes: taskData.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.tasks.set(id, task);

    // Create activity log for task creation
    await this.createActivity({
      id: randomUUID(),
      taskId: id,
      type: "STATUS_CHANGE",
      meta: { 
        action: "created",
        status: "OPEN",
        rule: matchingRule ? {
          type: matchingRule.type,
          assigneeId: matchingRule.assigneeId,
          priority: matchingRule.priority,
          dueOffsetHours: matchingRule.dueOffsetHours
        } : null
      },
      createdAt: now,
    });
    
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
      
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
    
    return tasks;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const now = new Date();
    const updatedTask = { 
      ...task, 
      ...updates,
      updatedAt: now,
      dueAt: updates.dueAt ? new Date(updates.dueAt) : task.dueAt,
    };
    
    // Log activity for changes
    if (updates.status && updates.status !== task.status) {
      await this.createActivity({
        id: randomUUID(),
        taskId: id,
        type: "STATUS_CHANGE",
        meta: { 
          oldStatus: task.status,
          newStatus: updates.status
        },
        createdAt: now,
      });
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== task.assigneeId) {
      await this.createActivity({
        id: randomUUID(),
        taskId: id,
        type: "ASSIGN",
        meta: { 
          oldAssigneeId: task.assigneeId,
          newAssigneeId: updates.assigneeId
        },
        createdAt: now,
      });
    }

    if (updates.dueAt && updates.dueAt !== task.dueAt?.toISOString()) {
      await this.createActivity({
        id: randomUUID(),
        taskId: id,
        type: "DUE_CHANGE",
        meta: { 
          oldDueAt: task.dueAt,
          newDueAt: updates.dueAt
        },
        createdAt: now,
      });
    }
    
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
    return Array.from(this.tasks.values()).find(task => task.sourceEventId === eventId);
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
        type: "INVENTORY_LOW" as const,
        sku: "SKU-001",
        channel: undefined,
        payload: { currentStock: 5, reorderLevel: 20, velocity: 2.5 },
        severity: "HIGH" as const,
      },
      {
        type: "SYNC_ERROR" as const,
        sku: undefined,
        channel: "Amazon",
        payload: { errorCode: "AUTH_FAILED", lastSync: "2025-01-07T10:00:00Z" },
        severity: "MEDIUM" as const,
      },
      {
        type: "PAYMENT_MISMATCH" as const,
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
      notes: poData.notes || null,
      linkedTaskId: poData.linkedTaskId || null,
      supplierEmail: poData.supplierEmail || null,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    };
    
    this.purchaseOrders.set(po.id, po);
    return po;
  }

  async getPurchaseOrders(organizationId: string, filters?: { status?: string }): Promise<PurchaseOrder[]> {
    const allPOs = Array.from(this.purchaseOrders.values())
      .filter(po => po.workspaceId === organizationId);

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

  // Initialize sample rules for auto-assignment
  private async initializeSampleRules(): Promise<void> {
    const sampleRules = [
      {
        id: "rule-restock",
        type: "RESTOCK" as const,
        assigneeId: "ops_user",
        priority: "P2" as const,
        dueOffsetHours: 24,
        createdAt: new Date(),
      },
      {
        id: "rule-reconcile", 
        type: "RECONCILE" as const,
        assigneeId: "finance_user",
        priority: "P3" as const,
        dueOffsetHours: 48,
        createdAt: new Date(),
      },
      {
        id: "rule-retry-sync",
        type: "RETRY_SYNC" as const,
        assigneeId: "tech_user", 
        priority: "P1" as const,
        dueOffsetHours: 2,
        createdAt: new Date(),
      }
    ];

    sampleRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  // Task Collaboration methods
  async createComment(taskId: string, authorId: string, commentData: CreateCommentData): Promise<Comment> {
    const id = randomUUID();
    const now = new Date();
    
    const comment: Comment = {
      id,
      taskId,
      authorId,
      message: commentData.message,
      createdAt: now,
    };
    
    this.comments.set(id, comment);

    // Create activity for comment
    await this.createActivity({
      id: randomUUID(),
      taskId,
      type: "COMMENT",
      meta: { commentId: id, authorId },
      createdAt: now,
    });
    
    return comment;
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getTaskActivity(taskId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      ...activityData,
      meta: activityData.meta || {},
      createdAt: activityData.createdAt || new Date(),
    };
    
    this.activities.set(activity.id, activity);
    return activity;
  }

  // Rules methods
  async getRules(): Promise<Rule[]> {
    return Array.from(this.rules.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createRule(ruleData: CreateRuleData): Promise<Rule> {
    const id = randomUUID();
    const now = new Date();
    
    const rule: Rule = {
      id,
      ...ruleData,
      priority: ruleData.priority || null,
      assigneeId: ruleData.assigneeId || null,
      dueOffsetHours: ruleData.dueOffsetHours || null,
      createdAt: now,
    };
    
    this.rules.set(id, rule);
    return rule;
  }

  async deleteRule(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }

  async findMatchingRule(taskType: string): Promise<Rule | undefined> {
    return Array.from(this.rules.values())
      .find(rule => rule.type === taskType);
  }

  // Reconciliation Methods
  async createReconBatch(batchData: InsertReconBatch): Promise<ReconBatch> {
    const batch: ReconBatch = {
      ...batchData,
      id: batchData.id || randomUUID(),
      notes: batchData.notes || null,
      periodFrom: batchData.periodFrom || null,
      periodTo: batchData.periodTo || null,
      updatedAt: null,
      mismatchedCount: batchData.mismatchedCount || 0,
      expectedBaseTotal: batchData.expectedBaseTotal || 0,
      paidBaseTotal: batchData.paidBaseTotal || 0,
      diffBaseTotal: batchData.diffBaseTotal || 0,
      ordersTotal: batchData.ordersTotal || 0,
      createdAt: new Date(),
    };
    this.reconBatches.set(batch.id, batch);
    return batch;
  }

  async createReconRow(rowData: InsertReconRow): Promise<ReconRow> {
    const row: ReconRow = {
      ...rowData,
      id: rowData.id || randomUUID(),
      status: rowData.status || "PENDING",
      notes: rowData.notes || null,
      taskId: rowData.taskId || null,
      eventId: rowData.eventId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reconRows.set(row.id, row);
    return row;
  }

  async getReconBatches(filters?: { region?: string, source?: string, limit?: number, offset?: number }): Promise<ReconBatch[]> {
    let batches = Array.from(this.reconBatches.values());
    
    if (filters?.region) {
      batches = batches.filter(b => b.region === filters.region);
    }
    if (filters?.source) {
      batches = batches.filter(b => b.source === filters.source);
    }
    
    // Sort by createdAt desc
    batches.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    
    if (filters?.offset) {
      batches = batches.slice(filters.offset);
    }
    if (filters?.limit) {
      batches = batches.slice(0, filters.limit);
    }
    
    return batches;
  }

  async getReconBatch(id: string): Promise<ReconBatch | undefined> {
    return this.reconBatches.get(id);
  }

  async getReconRows(batchId: string, filters?: { status?: string, hasDiff?: boolean, limit?: number, offset?: number }): Promise<ReconRow[]> {
    let rows = Array.from(this.reconRows.values()).filter(r => r.batchId === batchId);
    
    if (filters?.status) {
      rows = rows.filter(r => r.status === filters.status);
    }
    if (filters?.hasDiff) {
      rows = rows.filter(r => Math.abs(r.diffBase) > 1); // More than 1 cent difference
    }
    
    if (filters?.offset) {
      rows = rows.slice(filters.offset);
    }
    if (filters?.limit) {
      rows = rows.slice(0, filters.limit);
    }
    
    return rows;
  }

  async getReconRow(id: string): Promise<ReconRow | undefined> {
    return this.reconRows.get(id);
  }

  async updateReconRow(id: string, updates: UpdateReconRowData): Promise<ReconRow | undefined> {
    const row = this.reconRows.get(id);
    if (!row) return undefined;
    
    const updatedRow: ReconRow = {
      ...row,
      ...updates,
      updatedAt: new Date(),
    };
    this.reconRows.set(id, updatedRow);
    return updatedRow;
  }

  async updateReconBatch(id: string, updates: Partial<ReconBatch>): Promise<ReconBatch | undefined> {
    const batch = this.reconBatches.get(id);
    if (!batch) return undefined;
    
    const updatedBatch: ReconBatch = {
      ...batch,
      ...updates,
      updatedAt: new Date(),
    };
    this.reconBatches.set(id, updatedBatch);
    return updatedBatch;
  }

  async updateReconBatchTotals(batchId: string, totals: { expectedBaseTotal: number, paidBaseTotal: number, diffBaseTotal: number, ordersTotal: number, mismatchedCount: number }): Promise<void> {
    const batch = this.reconBatches.get(batchId);
    if (!batch) return;
    
    const updatedBatch: ReconBatch = {
      ...batch,
      expectedBaseTotal: totals.expectedBaseTotal,
      paidBaseTotal: totals.paidBaseTotal,
      diffBaseTotal: totals.diffBaseTotal,
      ordersTotal: totals.ordersTotal,
      mismatchedCount: totals.mismatchedCount,
    };
    this.reconBatches.set(batchId, updatedBatch);
  }

  // Simple Purchase Orders for manual restock feature
  async createSimplePurchaseOrder(poData: InsertSimplePurchaseOrder): Promise<SimplePurchaseOrder> {
    const id = randomUUID();
    const now = new Date();
    const po: SimplePurchaseOrder = {
      id,
      ...poData,
      date: now,
      status: "DRAFT",
      createdAt: now,
    };
    this.simplePurchaseOrders.set(id, po);
    return po;
  }

  async getSimplePurchaseOrders(): Promise<SimplePurchaseOrder[]> {
    return Array.from(this.simplePurchaseOrders.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async updateSimplePurchaseOrderStatus(id: string, status: string): Promise<SimplePurchaseOrder | undefined> {
    const po = this.simplePurchaseOrders.get(id);
    if (!po) return undefined;
    
    const updatedPo: SimplePurchaseOrder = {
      ...po,
      status: status as "DRAFT" | "SENT" | "RECEIVED",
    };
    this.simplePurchaseOrders.set(id, updatedPo);
    return updatedPo;
  }

  // Restock Autopilot - Supplier methods
  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const now = new Date();
    const supplier: Supplier = {
      id,
      ...supplierData,
      address: supplierData.address || null,
      email: supplierData.email || null,
      phone: supplierData.phone || null,
      notes: supplierData.notes || null,
      // SLA metrics fields with defaults
      onTimeTargetPct: 95,
      defectTargetPct: 5,
      onTimeRatePct: 100,
      defectRatePct: 0,
      avgLeadTimeDays: 0,
      breachCount: 0,
      totalDeliveries: 0,
      lastBreachDate: null,
      createdAt: now,
      updatedAt: now,
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async getSuppliers(workspaceId: string, filters?: { sku?: string }): Promise<Supplier[]> {
    let suppliers = Array.from(this.suppliers.values()).filter(s => s.workspaceId === workspaceId);

    if (filters?.sku) {
      suppliers = suppliers.filter(s => 
        s.skus.some(skuData => skuData.sku === filters.sku)
      );
    }

    return suppliers.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return undefined;

    const updatedSupplier = {
      ...supplier,
      ...updates,
      updatedAt: new Date(),
    };

    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    this.suppliers.delete(id);
  }

  // Restock Autopilot - Reorder Policy methods
  async createReorderPolicy(policyData: InsertReorderPolicy): Promise<ReorderPolicy> {
    const id = randomUUID();
    const now = new Date();
    const policy: ReorderPolicy = {
      id,
      ...policyData,
      maxDaysCover: policyData.maxDaysCover || null,
      createdAt: now,
      updatedAt: now,
    };

    // Remove existing policy for this SKU if any
    const existingKey = Array.from(this.reorderPolicies.entries())
      .find(([_, p]) => p.workspaceId === policyData.workspaceId && p.sku === policyData.sku)?.[0];
    
    if (existingKey) {
      this.reorderPolicies.delete(existingKey);
    }

    this.reorderPolicies.set(id, policy);
    return policy;
  }

  async getReorderPolicy(workspaceId: string, sku: string): Promise<ReorderPolicy | undefined> {
    return Array.from(this.reorderPolicies.values())
      .find(p => p.workspaceId === workspaceId && p.sku === sku);
  }

  async updateReorderPolicy(workspaceId: string, sku: string, updates: Partial<ReorderPolicy>): Promise<ReorderPolicy | undefined> {
    const policy = await this.getReorderPolicy(workspaceId, sku);
    if (!policy) return undefined;

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.reorderPolicies.set(policy.id, updatedPolicy);
    return updatedPolicy;
  }

  // Workspace Settings methods
  async getWorkspaceSettings(organizationId: string): Promise<WorkspaceSettings | undefined> {
    return Array.from(this.workspaceSettings.values()).find(
      settings => settings.organizationId === organizationId
    );
  }

  async createWorkspaceSettings(organizationId: string, settings: InsertWorkspaceSettings): Promise<WorkspaceSettings> {
    const newSettings: WorkspaceSettings = {
      id: randomUUID(),
      organizationId,
      orgName: settings.orgName || "Default Organization",
      logoUrl: settings.logoUrl || null,
      defaultCurrency: settings.defaultCurrency || "USD",
      defaultTimezone: settings.defaultTimezone || "UTC",
      dateFormat: settings.dateFormat || "MM/DD/YYYY",
      numberFormat: settings.numberFormat || "US",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workspaceSettings.set(newSettings.id, newSettings);
    return newSettings;
  }

  async updateWorkspaceSettings(organizationId: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    let existingSettings = await this.getWorkspaceSettings(organizationId);
    
    if (!existingSettings) {
      // Create default settings if none exist
      existingSettings = await this.createWorkspaceSettings(organizationId, {
        organizationId,
        orgName: "Default Organization",
        defaultCurrency: "USD",
        defaultTimezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        numberFormat: "US"
      });
    }

    const updatedSettings: WorkspaceSettings = {
      ...existingSettings,
      ...settings,
      updatedAt: new Date(),
    };

    this.workspaceSettings.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }

  // Regions methods
  async getRegions(organizationId: string): Promise<Region[]> {
    return Array.from(this.regions.values()).filter(
      region => region.organizationId === organizationId
    );
  }

  async createRegion(organizationId: string, regionData: any): Promise<Region> {
    const newRegion: Region = {
      id: randomUUID(),
      organizationId,
      name: regionData.name,
      currency: regionData.currency || null,
      timezone: regionData.timezone || null,
      slaDays: regionData.slaDays || 1,
      restockBufferPct: regionData.restockBufferPct || 20,
      isActive: regionData.isActive !== false ? "true" : "false",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.regions.set(newRegion.id, newRegion);
    return newRegion;
  }

  async updateRegion(regionId: string, updates: any): Promise<Region> {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new Error(`Region ${regionId} not found`);
    }

    const updatedRegion: Region = {
      ...region,
      ...updates,
      updatedAt: new Date(),
    };

    this.regions.set(regionId, updatedRegion);
    return updatedRegion;
  }

  async deleteRegion(regionId: string): Promise<void> {
    this.regions.delete(regionId);
  }

  // Notification Settings methods
  async getNotificationSettings(organizationId: string): Promise<NotificationSettings | undefined> {
    return Array.from(this.notificationSettings.values()).find(
      settings => settings.organizationId === organizationId
    );
  }

  async createNotificationSettings(organizationId: string, settings: any): Promise<NotificationSettings> {
    const newSettings: NotificationSettings = {
      id: randomUUID(),
      organizationId,
      dailyDigestEnabled: settings.dailyDigestEnabled || "true",
      digestTime: settings.digestTime || "09:00",
      alertsEnabled: settings.alertsEnabled || "true",
      smtpHost: settings.smtpHost || null,
      smtpPort: settings.smtpPort || null,
      smtpUsername: settings.smtpUsername || null,
      smtpFromEmail: settings.smtpFromEmail || null,
      smtpPassword: settings.smtpPassword || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notificationSettings.set(newSettings.id, newSettings);
    return newSettings;
  }

  async updateNotificationSettings(organizationId: string, updates: any): Promise<NotificationSettings> {
    let existing = await this.getNotificationSettings(organizationId);
    
    if (!existing) {
      existing = await this.createNotificationSettings(organizationId, updates);
      return existing;
    }

    const updatedSettings: NotificationSettings = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.notificationSettings.set(existing.id, updatedSettings);
    return updatedSettings;
  }

  // Initialize sample suppliers for testing
  private async initializeSampleSuppliers(): Promise<void> {
    const defaultWorkspaceId = "default-workspace";
    
    const sampleSuppliers = [
      {
        workspaceId: defaultWorkspaceId,
        name: "ABC Exports",
        region: "India" as const,
        contact: "raj@abcexports.in",
        leadTimeDays: 12,
        paymentTerms: "Net 30",
        status: "active" as const,
        currency: "INR" as const,
        skus: [
          { sku: "SKU-001", unitCost: 25.00, leadTimeDays: 12, moq: 100 },
          { sku: "SKU-002", unitCost: 45.50, leadTimeDays: 12, moq: 50 }
        ]
      },
      {
        workspaceId: defaultWorkspaceId,
        name: "FastShip UK Ltd",
        region: "UK" as const,
        contact: "orders@fastshipuk.com",
        leadTimeDays: 5,
        paymentTerms: "Net 15",
        status: "active" as const,
        currency: "GBP" as const,
        skus: [
          { sku: "SKU-003", unitCost: 18.75, leadTimeDays: 5, moq: 200 },
          { sku: "SKU-001", unitCost: 28.00, leadTimeDays: 5, moq: 150 }
        ]
      }
    ];

    for (const supplierData of sampleSuppliers) {
      await this.createSupplier(supplierData);
    }
    
    // Initialize sample delivery tracking data
    await this.initializeSampleDeliveries();
  }

  // SLA Tracking implementation
  async createSupplierDelivery(deliveryData: InsertSupplierDelivery): Promise<SupplierDelivery> {
    const id = randomUUID();
    const now = new Date();
    
    const delivery: SupplierDelivery = {
      id,
      ...deliveryData,
      purchaseOrderId: deliveryData.purchaseOrderId || null,
      expectedDate: new Date(deliveryData.expectedDate),
      actualDate: deliveryData.actualDate ? new Date(deliveryData.actualDate) : null,
      actualLeadTimeDays: deliveryData.actualLeadTimeDays || null,
      isDefective: deliveryData.isDefective || false,
      defectNotes: deliveryData.defectNotes || null,
      breachType: "NONE",
      createdAt: now,
      updatedAt: now,
    };
    
    // Auto-calculate breach type and status
    if (delivery.actualDate) {
      const isLate = delivery.actualDate > delivery.expectedDate;
      const hasDefects = delivery.isDefective;
      
      if (isLate && hasDefects) {
        delivery.breachType = "BOTH";
        delivery.status = "DEFECTIVE";
      } else if (isLate) {
        delivery.breachType = "LATE_DELIVERY";
        delivery.status = "LATE";
      } else if (hasDefects) {
        delivery.breachType = "QUALITY_ISSUE";
        delivery.status = "DEFECTIVE";
      } else {
        delivery.status = "ON_TIME";
      }
    }
    
    this.supplierDeliveries.set(id, delivery);
    
    // Update supplier SLA metrics after creating delivery
    await this.updateSupplierSLAMetrics(delivery.supplierId);
    
    return delivery;
  }

  async updateSupplierDelivery(id: string, updates: Partial<SupplierDelivery>): Promise<SupplierDelivery | undefined> {
    const delivery = this.supplierDeliveries.get(id);
    if (!delivery) return undefined;
    
    const updatedDelivery: SupplierDelivery = {
      ...delivery,
      ...updates,
      updatedAt: new Date(),
    };
    
    // Recalculate breach type if actualDate or defect status changed
    if (updates.actualDate || updates.isDefective !== undefined) {
      if (updatedDelivery.actualDate) {
        const isLate = updatedDelivery.actualDate > updatedDelivery.expectedDate;
        const hasDefects = updatedDelivery.isDefective;
        
        if (isLate && hasDefects) {
          updatedDelivery.breachType = "BOTH";
          updatedDelivery.status = "DEFECTIVE";
        } else if (isLate) {
          updatedDelivery.breachType = "LATE_DELIVERY";
          updatedDelivery.status = "LATE";
        } else if (hasDefects) {
          updatedDelivery.breachType = "QUALITY_ISSUE";
          updatedDelivery.status = "DEFECTIVE";
        } else {
          updatedDelivery.breachType = "NONE";
          updatedDelivery.status = "ON_TIME";
        }
      }
    }
    
    this.supplierDeliveries.set(id, updatedDelivery);
    
    // Update supplier SLA metrics
    await this.updateSupplierSLAMetrics(delivery.supplierId);
    
    return updatedDelivery;
  }

  async getSupplierDeliveries(supplierId: string): Promise<SupplierDelivery[]> {
    return Array.from(this.supplierDeliveries.values())
      .filter(delivery => delivery.supplierId === supplierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async calculateSupplierSLAMetrics(supplierId: string): Promise<{ onTimeRatePct: number, defectRatePct: number, avgLeadTimeDays: number, breachCount: number, totalDeliveries: number }> {
    const deliveries = await this.getSupplierDeliveries(supplierId);
    const completedDeliveries = deliveries.filter(d => d.actualDate !== null);
    
    if (completedDeliveries.length === 0) {
      return {
        onTimeRatePct: 100,
        defectRatePct: 0,
        avgLeadTimeDays: 0,
        breachCount: 0,
        totalDeliveries: 0
      };
    }
    
    const onTimeDeliveries = completedDeliveries.filter(d => d.status === "ON_TIME");
    const defectiveDeliveries = completedDeliveries.filter(d => d.isDefective);
    const breachedDeliveries = completedDeliveries.filter(d => d.breachType !== "NONE");
    
    const totalLeadTime = completedDeliveries.reduce((sum, d) => sum + (d.actualLeadTimeDays || 0), 0);
    
    return {
      onTimeRatePct: (onTimeDeliveries.length / completedDeliveries.length) * 100,
      defectRatePct: (defectiveDeliveries.length / completedDeliveries.length) * 100,
      avgLeadTimeDays: totalLeadTime / completedDeliveries.length,
      breachCount: breachedDeliveries.length,
      totalDeliveries: completedDeliveries.length
    };
  }

  async updateSupplierSLAMetrics(supplierId: string): Promise<void> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) return;
    
    const metrics = await this.calculateSupplierSLAMetrics(supplierId);
    const hasNewBreach = metrics.breachCount > (supplier.breachCount || 0);
    
    const updatedSupplier: Supplier = {
      ...supplier,
      onTimeRatePct: metrics.onTimeRatePct,
      defectRatePct: metrics.defectRatePct,
      avgLeadTimeDays: metrics.avgLeadTimeDays,
      breachCount: metrics.breachCount,
      totalDeliveries: metrics.totalDeliveries,
      lastBreachDate: hasNewBreach ? new Date() : supplier.lastBreachDate,
      updatedAt: new Date(),
    };
    
    this.suppliers.set(supplierId, updatedSupplier);
    
    // Generate SLA breach alert if there's a new breach
    if (hasNewBreach) {
      await this.createEvent({
        type: "SYNC_ERROR", // SLA breaches are operational sync issues
        sku: undefined,
        channel: undefined,
        payload: {
          supplierId,
          supplierName: supplier.name,
          breachType: "SLA_VIOLATION",
          onTimeRate: metrics.onTimeRatePct,
          defectRate: metrics.defectRatePct,
          targetOnTime: supplier.onTimeTargetPct || 95,
          targetDefect: supplier.defectTargetPct || 2
        },
        severity: "HIGH"
      });
    }
  }

  async getSuppliersWithSLABreaches(workspaceId: string): Promise<Supplier[]> {
    const suppliers = await this.getSuppliers(workspaceId);
    return suppliers.filter(supplier => {
      const onTimeBreach = (supplier.onTimeRatePct || 100) < (supplier.onTimeTargetPct || 95);
      const defectBreach = (supplier.defectRatePct || 0) > (supplier.defectTargetPct || 2);
      return onTimeBreach || defectBreach;
    });
  }

  async getSupplierSLAMetrics(workspaceId: string): Promise<{ suppliers: any[], global: any }> {
    const suppliers = await this.getSuppliers(workspaceId);
    
    const supplierMetrics = suppliers.map(supplier => ({
      supplierId: supplier.id,
      supplierName: supplier.name,
      onTimeRatePct: supplier.onTimeRatePct || 100,
      defectRatePct: supplier.defectRatePct || 0,
      avgLeadTimeDays: supplier.avgLeadTimeDays || supplier.leadTimeDays,
      breachCount: supplier.breachCount || 0,
      totalPOs: supplier.totalDeliveries || 0,
      onTimeTargetPct: supplier.onTimeTargetPct || 95,
      defectTargetPct: supplier.defectTargetPct || 2,
    }));
    
    // Calculate global stats
    const totalDeliveries = supplierMetrics.reduce((sum, s) => sum + s.totalPOs, 0);
    const avgLeadTime = totalDeliveries > 0 
      ? supplierMetrics.reduce((sum, s) => sum + (s.avgLeadTimeDays * s.totalPOs), 0) / totalDeliveries
      : 0;
    const globalOnTimeRate = totalDeliveries > 0 
      ? supplierMetrics.reduce((sum, s) => sum + (s.onTimeRatePct * s.totalPOs), 0) / totalDeliveries
      : 100;
    const totalBreaches = supplierMetrics.reduce((sum, s) => sum + s.breachCount, 0);
    const suppliersAtRisk = supplierMetrics.filter(s => 
      s.onTimeRatePct < s.onTimeTargetPct || s.defectRatePct > s.defectTargetPct
    ).length;
    
    return {
      suppliers: supplierMetrics,
      global: {
        avgLeadTime,
        globalOnTimeRate,
        totalBreaches,
        suppliersAtRisk,
      }
    };
  }

  async initializeSampleDeliveries(): Promise<void> {
    const suppliers = Array.from(this.suppliers.values());
    if (suppliers.length === 0) return;
    
    // Create some sample delivery tracking data
    const sampleDeliveries = [
      {
        supplierId: suppliers[0].id,
        expectedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        actualDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days ago (on time)
        status: "ON_TIME" as const,
        leadTimeDays: 12,
        actualLeadTimeDays: 10,
        isDefective: false,
      },
      {
        supplierId: suppliers[0].id,
        expectedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        actualDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago (late)
        status: "LATE" as const,
        leadTimeDays: 12,
        actualLeadTimeDays: 15,
        isDefective: false,
      },
      {
        supplierId: suppliers[1].id,
        expectedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        actualDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago (on time but defective)
        status: "DEFECTIVE" as const,
        leadTimeDays: 5,
        actualLeadTimeDays: 4,
        isDefective: true,
        defectNotes: "Quality issues found in 10% of items",
      },
    ];
    
    for (const deliveryData of sampleDeliveries) {
      await this.createSupplierDelivery(deliveryData);
    }
  }

  // Customer methods
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      id: randomUUID(),
      ...customerData,
      email: customerData.email || null,
      phone: customerData.phone || null,
      address: customerData.address || null,
      company: customerData.company || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async getCustomers(workspaceId: string, filters?: { search?: string, company?: string }): Promise<Customer[]> {
    let customers = Array.from(this.customers.values()).filter(c => c.workspaceId === workspaceId);
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      customers = customers.filter(c => 
        c.name.toLowerCase().includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.company && c.company.toLowerCase().includes(search))
      );
    }
    
    if (filters?.company) {
      customers = customers.filter(c => c.company === filters.company);
    }
    
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async updateCustomer(id: string, updates: UpdateCustomer): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer: Customer = {
      ...customer,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    this.customers.delete(id);
    // Also soft delete related orders (set customerId to null)
    for (const [orderId, order] of this.salesOrders) {
      if (order.customerId === id) {
        this.salesOrders.set(orderId, {
          ...order,
          customerId: "",  // Empty string instead of null for compatibility
          customerName: "Deleted Customer",
        });
      }
    }
  }

  async getCustomerOrders(customerId: string): Promise<SalesOrder[]> {
    return Array.from(this.salesOrders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Sales Order methods
  async createSalesOrder(orderData: InsertSalesOrder): Promise<SalesOrder> {
    const order: SalesOrder = {
      id: randomUUID(),
      ...orderData,
      notes: orderData.notes || null,
      customerEmail: orderData.customerEmail || null,
      shippingAddress: orderData.shippingAddress || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.salesOrders.set(order.id, order);
    return order;
  }

  async getSalesOrders(workspaceId: string, filters?: { customerId?: string, status?: string }): Promise<SalesOrder[]> {
    let orders = Array.from(this.salesOrders.values()).filter(o => o.workspaceId === workspaceId);
    
    if (filters?.customerId) {
      orders = orders.filter(o => o.customerId === filters.customerId);
    }
    
    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    
    return orders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getSalesOrder(id: string): Promise<SalesOrder | undefined> {
    return this.salesOrders.get(id);
  }

  async updateSalesOrder(id: string, updates: UpdateSalesOrder): Promise<SalesOrder | undefined> {
    const order = this.salesOrders.get(id);
    if (!order) return undefined;
    
    const updatedOrder: SalesOrder = {
      ...order,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.salesOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async deleteSalesOrder(id: string): Promise<void> {
    this.salesOrders.delete(id);
  }

  async initializeSampleCustomers(): Promise<void> {
    // Use the current user's workspace ID
    const workspaceId = "1607cbd7-2c11-414b-a9ec-79083eecbee5";
    
    // Create sample customers
    const sampleCustomers = [
      {
        name: "Acme Corporation",
        email: "contact@acme-corp.com",
        phone: "+1-555-0123",
        company: "Acme Corporation",
        address: "123 Business Ave, New York, NY 10001",
        workspaceId,
      },
      {
        name: "TechStart Solutions",
        email: "hello@techstart.io",
        phone: "+1-555-0456",
        company: "TechStart Solutions",
        address: "456 Innovation Dr, San Francisco, CA 94105",
        workspaceId,
      },
      {
        name: "Global Enterprises",
        email: "info@globalent.com",
        phone: "+1-555-0789",
        company: "Global Enterprises",
        address: "789 Corporate Blvd, Chicago, IL 60601",
        workspaceId,
      },
      {
        name: "John Smith",
        email: "john@smith.com",
        phone: "+1-555-1234",
        company: undefined,
        address: "321 Residential St, Austin, TX 73301",
        workspaceId,
      },
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-5678",
        company: "Freelance Design Co",
        address: "654 Creative Way, Portland, OR 97201",
        workspaceId,
      },
    ];

    for (const customerData of sampleCustomers) {
      const customer = await this.createCustomer(customerData);
      
      // Create some sample orders for each customer
      const orderCount = Math.floor(Math.random() * 3) + 1; // 1-3 orders per customer
      
      for (let i = 0; i < orderCount; i++) {
        const orderNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const statuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const items = [
          {
            sku: `ITEM-${Math.floor(Math.random() * 1000)}`,
            productName: `Sample Product ${Math.floor(Math.random() * 100)}`,
            quantity: Math.floor(Math.random() * 5) + 1,
            unitPrice: Math.floor(Math.random() * 10000) + 1000, // $10-$100 in cents
            subtotal: 0, // Will be calculated
          }
        ];
        
        // Calculate subtotal
        items[0].subtotal = items[0].quantity * items[0].unitPrice;
        
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = Math.floor(subtotal * 0.08); // 8% tax
        const shipping = Math.floor(Math.random() * 1000) + 500; // $5-$15 shipping
        const total = subtotal + tax + shipping;

        await this.createSalesOrder({
          orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email || undefined,
          workspaceId,
          currency: "USD",
          status: status as any,
          items,
          subtotal,
          tax,
          shipping,
          total,
          shippingAddress: customer.address || undefined,
          notes: i === 0 ? "First order - welcome customer!" : undefined,
        });
      }
    }
  }

  // Shipping Connector methods
  async createShippingConnector(connectorData: InsertShippingConnector): Promise<ShippingConnector> {
    const id = randomUUID();
    const now = new Date();
    const connector: ShippingConnector = {
      id,
      ...connectorData,
      lastTestAt: null,
      lastTestStatus: null,
      createdAt: now,
      updatedAt: now,
    };
    this.shippingConnectors.set(id, connector);
    return connector;
  }

  async getShippingConnectors(organizationId: string): Promise<ShippingConnector[]> {
    return Array.from(this.shippingConnectors.values())
      .filter(c => c.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getShippingConnector(id: string): Promise<ShippingConnector | undefined> {
    return this.shippingConnectors.get(id);
  }

  async updateShippingConnector(id: string, updates: Partial<ShippingConnector>): Promise<ShippingConnector | undefined> {
    const connector = this.shippingConnectors.get(id);
    if (!connector) return undefined;

    const updatedConnector: ShippingConnector = {
      ...connector,
      ...updates,
      updatedAt: new Date(),
    };

    this.shippingConnectors.set(id, updatedConnector);
    return updatedConnector;
  }

  async deleteShippingConnector(id: string): Promise<void> {
    this.shippingConnectors.delete(id);
    // Also clean up related shipments
    Array.from(this.shipments.keys()).forEach(shipmentId => {
      const shipment = this.shipments.get(shipmentId);
      if (shipment && shipment.connectorId === id) {
        this.shipments.delete(shipmentId);
      }
    });
  }

  async testShippingConnector(id: string): Promise<{ success: boolean; error?: string }> {
    // TODO: This would integrate with the actual shipping adapter in a real implementation
    const connector = this.shippingConnectors.get(id);
    if (!connector) {
      return { success: false, error: 'Connector not found' };
    }

    // Simulate test result
    const success = Math.random() > 0.05; // 95% success rate for demo
    const now = new Date();
    
    await this.updateShippingConnector(id, {
      lastTestAt: now,
      lastTestStatus: success ? 'success' : 'failed',
      status: success ? 'active' : 'error',
    });

    return success ? 
      { success: true } : 
      { success: false, error: 'Connection test failed - please check credentials' };
  }

  // Shipment methods
  async createShipment(shipmentData: InsertShipment): Promise<Shipment> {
    const id = randomUUID();
    const now = new Date();
    const shipment: Shipment = {
      id,
      ...shipmentData,
      createdAt: now,
      updatedAt: now,
    };
    this.shipments.set(id, shipment);
    return shipment;
  }

  async getShipments(organizationId: string, filters?: { connectorId?: string, orderId?: string, status?: string }): Promise<Shipment[]> {
    let shipments = Array.from(this.shipments.values())
      .filter(s => s.organizationId === organizationId);

    if (filters?.connectorId) {
      shipments = shipments.filter(s => s.connectorId === filters.connectorId);
    }

    if (filters?.orderId) {
      shipments = shipments.filter(s => s.salesOrderId === filters.orderId);
    }

    if (filters?.status) {
      shipments = shipments.filter(s => s.status === filters.status);
    }

    return shipments.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    return this.shipments.get(id);
  }

  async updateShipment(id: string, updates: Partial<Shipment>): Promise<Shipment | undefined> {
    const shipment = this.shipments.get(id);
    if (!shipment) return undefined;

    const updatedShipment: Shipment = {
      ...shipment,
      ...updates,
      updatedAt: new Date(),
    };

    this.shipments.set(id, updatedShipment);
    return updatedShipment;
  }
}

export const storage = new MemStorage();
