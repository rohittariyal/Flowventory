import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(), // Email of admin who created org
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  companyName: text("company_name").notNull(),
  role: text("role", { enum: ["admin", "manager", "viewer"] }).notNull().default("viewer"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  onboardingComplete: text("onboarding_complete").default("false"),
  platformConnections: jsonb("platform_connections").default({}),
  baseCurrency: text("base_currency", { enum: ["INR", "GBP", "AED", "SGD", "USD"] }).default("INR"),
  invitedBy: text("invited_by"), // Email of admin who invited them
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workspace settings table
export const workspaceSettings = pgTable("workspace_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  baseCurrency: text("base_currency", { enum: ["INR", "USD", "GBP", "AED", "SGD"] }).default("INR").notNull(),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  regionsEnabled: text("regions_enabled").array().default([]).notNull(),
  slaDefaults: jsonb("sla_defaults").default({
    RESTOCK: 24,
    RETRY_SYNC: 2,
    RECONCILE: 72
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  role: text("role", { enum: ["manager", "viewer"] }).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  invitedBy: text("invited_by").notNull(), // Admin email
  status: text("status", { enum: ["pending", "accepted", "expired"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // Null for organization-wide notifications
  type: text("type", { enum: ["inventory_low", "api_connection_failed", "no_upload", "team_update", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  icon: text("icon").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  isRead: text("is_read").default("false").notNull(),
  readBy: jsonb("read_by").default({}), // Store user IDs who have read this notification
  metadata: jsonb("metadata").default({}), // Additional data like product SKU, connection name, etc.
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // For auto-expiring notifications
});

export const onboardingData = pgTable("onboarding_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  // Business Overview
  companyName: text("company_name").notNull(),
  industry: text("industry", { enum: ["apparel", "electronics", "beauty", "home", "other"] }).notNull(),
  monthlyOrders: text("monthly_orders", { enum: ["0-100", "100-500", "500-1000", "1000+"] }).notNull(),
  productsLive: text("products_live").notNull(),
  businessLocation: text("business_location").notNull(),
  // Sales Channels
  salesChannels: text("sales_channels").array().notNull(),
  // Inventory Setup
  manageOwnWarehouse: text("manage_own_warehouse", { enum: ["yes", "no"] }).notNull(),
  averageStockPerSku: text("average_stock_per_sku").notNull(),
  reorderFrequency: text("reorder_frequency", { enum: ["weekly", "bi-weekly", "monthly"] }).notNull(),
  reorderMethod: text("reorder_method", { enum: ["manual", "excel", "tool"] }).notNull(),
  // AI Preferences
  aiAssistance: text("ai_assistance").array().notNull(),
  notificationMethods: text("notification_methods").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  companyName: true,
  role: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

export const loginSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const onboardingSchema = createInsertSchema(onboardingData).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  productsLive: z.string().min(1, "Products live is required"),
  businessLocation: z.string().min(2, "Business location must be at least 2 characters"),
  averageStockPerSku: z.string().min(1, "Average stock per SKU is required"),
  salesChannels: z.array(z.string()).min(1, "At least one sales channel is required"),
  aiAssistance: z.array(z.string()),
  notificationMethods: z.array(z.string()).min(1, "At least one notification method is required"),
});

// Platform connection types
export interface PlatformConnection {
  connected: boolean;
  apiKey?: string;
  connectedAt?: string;
}

export interface PlatformConnections {
  [platformName: string]: PlatformConnection;
}

// Schema for updating platform connections
export const platformConnectionSchema = z.object({
  platform: z.string().min(1, "Platform name is required"),
  apiKey: z.string().min(1, "API key is required"),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invitations: many(teamInvitations),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamInvitations.organizationId],
    references: [organizations.id],
  }),
}));

// Purchase Orders Schema - Restock Autopilot V1
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  supplierId: varchar("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierEmail: text("supplier_email"),
  currency: text("currency", { enum: ["INR", "GBP", "USD", "AED", "SGD"] }).notNull(),
  status: text("status", { enum: ["DRAFT", "SENT", "RECEIVED", "CANCELLED"] }).notNull().default('DRAFT'),
  items: jsonb("items").$type<{
    sku: string;
    name?: string;
    qty: number;
    unitCost: number;
    taxRate?: number;
    subtotal: number;
    taxAmount: number;
    total: number;
  }[]>().notNull().default([]),
  totals: jsonb("totals").$type<{
    subtotal: number;
    tax: number;
    grandTotal: number;
  }>().notNull().default({ subtotal: 0, tax: 0, grandTotal: 0 }),
  notes: text("notes"),
  linkedTaskId: varchar("linked_task_id").references(() => tasks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertPurchaseOrderSchema = z.object({
  workspaceId: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  supplierEmail: z.string().optional(),
  currency: z.enum(["INR", "GBP", "USD", "AED", "SGD"]),
  status: z.enum(["DRAFT", "SENT", "RECEIVED", "CANCELLED"]).default('DRAFT'),
  items: z.array(z.object({
    sku: z.string(),
    name: z.string().optional(),
    qty: z.number().int().min(1),
    unitCost: z.number().min(0),
    taxRate: z.number().min(0).max(100).optional(),
    subtotal: z.number(),
    taxAmount: z.number(),
    total: z.number()
  })),
  totals: z.object({
    subtotal: z.number(),
    tax: z.number(),
    grandTotal: z.number()
  }),
  notes: z.string().optional(),
  linkedTaskId: z.string().optional()
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Team management schemas
export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["manager", "viewer"], { required_error: "Role is required" }),
});

export const updateTeamMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["manager", "viewer"], { required_error: "Role is required" }),
});

// Notification schemas
export const createNotificationSchema = z.object({
  type: z.enum(["inventory_low", "api_connection_failed", "no_upload", "team_update", "system"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  icon: z.string().min(1, "Icon is required"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  userId: z.string().optional(), // For user-specific notifications
  metadata: z.record(z.any()).default({}),
  expiresAt: z.string().optional(), // ISO string
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});

// Action Center Events
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  type: text("type", { 
    enum: ["INVENTORY_LOW", "SYNC_ERROR", "PAYMENT_MISMATCH", "ROAS_DROP"] 
  }).notNull(),
  sku: text("sku"),
  channel: text("channel"),
  payload: jsonb("payload").notNull(), // Event-specific data
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH"] }).notNull(),
  occurredAt: timestamp("occurred_at").defaultNow(),
  status: text("status", { enum: ["OPEN", "HANDLED"] }).default("OPEN"),
});

// Action Center Tasks
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sourceEventId: text("source_event_id").unique().references(() => events.id, { onDelete: "cascade" }),
  type: text("type", { 
    enum: ["RESTOCK", "RETRY_SYNC", "RECONCILE", "ADJUST_BUDGET"] 
  }).notNull(),
  assigneeId: text("assignee_id").references(() => users.id),
  priority: text("priority", { enum: ["P1", "P2", "P3"] }).notNull(),
  dueAt: timestamp("due_at"),
  status: text("status", { enum: ["OPEN", "IN_PROGRESS", "DONE", "DISMISSED"] }).default("OPEN"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Action Center schemas
export const createEventSchema = z.object({
  type: z.enum(["INVENTORY_LOW", "SYNC_ERROR", "PAYMENT_MISMATCH", "ROAS_DROP"]),
  sku: z.string().optional(),
  channel: z.string().optional(),
  payload: z.any(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sourceEventId: z.string().optional(),
  type: z.enum(["RESTOCK", "RETRY_SYNC", "RECONCILE", "ADJUST_BUDGET"]),
  assigneeId: z.string().optional(),
  priority: z.enum(["P1", "P2", "P3"]),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTaskSchema = z.object({
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "DISMISSED"]).optional(),
  notes: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type OnboardingData = typeof onboardingData.$inferSelect;
export type InsertOnboardingData = z.infer<typeof onboardingSchema>;
export type InviteTeamMemberData = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberData = z.infer<typeof updateTeamMemberSchema>;
export type CreateNotificationData = z.infer<typeof createNotificationSchema>;
export type MarkNotificationReadData = z.infer<typeof markNotificationReadSchema>;

// Action Center types
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type CreateEventData = z.infer<typeof createEventSchema>;
export type CreateTaskData = z.infer<typeof createTaskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;

// Task Collaboration tables
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type", { 
    enum: ["STATUS_CHANGE", "ASSIGN", "COMMENT", "DUE_CHANGE"] 
  }).notNull(),
  meta: jsonb("meta"), // Additional data like old/new values
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rules = pgTable("rules", {
  id: text("id").primaryKey(),
  type: text("type", { 
    enum: ["RESTOCK", "RECONCILE", "RETRY_SYNC", "ADJUST_BUDGET"] 
  }).notNull().unique(),
  assigneeId: text("assignee_id").references(() => users.id),
  priority: text("priority", { enum: ["P1", "P2", "P3"] }),
  dueOffsetHours: integer("due_offset_hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Task collaboration schemas
export const createCommentSchema = z.object({
  message: z.string().min(1, "Comment cannot be empty"),
});

export const createRuleSchema = z.object({
  type: z.enum(["RESTOCK", "RECONCILE", "RETRY_SYNC", "ADJUST_BUDGET"]),
  assigneeId: z.string().optional(),
  priority: z.enum(["P1", "P2", "P3"]).optional(),
  dueOffsetHours: z.number().int().min(0).optional(),
});

// Task collaboration types
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;
export type CreateCommentData = z.infer<typeof createCommentSchema>;
export type CreateRuleData = z.infer<typeof createRuleSchema>;

// Reconciliation Schema
export const reconBatches = pgTable("recon_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  source: text("source", { enum: ["Amazon", "Shopify", "Flipkart", "Other"] }).notNull(),
  region: text("region", { enum: ["UK", "UAE", "SG", "US", "IN", "EU", "GLOBAL"] }).notNull(),
  periodFrom: timestamp("period_from"),
  periodTo: timestamp("period_to"),
  inputCurrencies: text("input_currencies").array().notNull(),
  baseCurrency: text("base_currency", { enum: ["INR", "GBP", "AED", "SGD", "USD"] }).notNull(),
  expectedBaseTotal: integer("expected_base_total").notNull().default(0),
  paidBaseTotal: integer("paid_base_total").notNull().default(0),
  diffBaseTotal: integer("diff_base_total").notNull().default(0),
  ordersTotal: integer("orders_total").notNull().default(0),
  mismatchedCount: integer("mismatched_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reconRows = pgTable("recon_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => reconBatches.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull(),
  currency: text("currency").notNull(),
  gross: integer("gross").notNull(), // in cents
  fees: integer("fees").notNull(), // in cents
  tax: integer("tax").notNull(), // in cents
  expectedNet: integer("expected_net").notNull(), // in cents
  paid: integer("paid").notNull(), // in cents
  diff: integer("diff").notNull(), // in cents
  expectedNetBase: integer("expected_net_base").notNull(), // in base currency cents
  paidBase: integer("paid_base").notNull(), // in base currency cents
  diffBase: integer("diff_base").notNull(), // in base currency cents
  status: text("status", { enum: ["PENDING", "PARTIAL", "RESOLVED"] }).default("PENDING").notNull(),
  taskId: varchar("task_id").references(() => tasks.id),
  eventId: varchar("event_id").references(() => events.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reconciliation schemas
export const reconIngestSchema = z.object({
  source: z.enum(["Amazon", "Shopify", "Flipkart", "Other"]),
  region: z.enum(["UK", "UAE", "SG", "US", "IN", "EU", "GLOBAL"]),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
});

export const updateReconRowSchema = z.object({
  status: z.enum(["PENDING", "PARTIAL", "RESOLVED"]).optional(),
  notes: z.string().optional(),
});

export type ReconBatch = typeof reconBatches.$inferSelect;
export type InsertReconBatch = typeof reconBatches.$inferInsert;
export type ReconRow = typeof reconRows.$inferSelect;
export type InsertReconRow = typeof reconRows.$inferInsert;
export type ReconIngestData = z.infer<typeof reconIngestSchema>;
export type UpdateReconRowData = z.infer<typeof updateReconRowSchema>;

// Simple Purchase Orders for manual restock feature
export const simplePurchaseOrders = pgTable("simple_purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").defaultNow().notNull(),
  sku: text("sku").notNull(),
  qty: integer("qty").notNull(),
  supplierName: text("supplier_name").notNull(),
  status: text("status", { enum: ["DRAFT", "SENT", "RECEIVED"] }).default("DRAFT").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const simplePurchaseOrderSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  supplierName: z.string().min(1, "Supplier name is required"),
});

export type SimplePurchaseOrder = typeof simplePurchaseOrders.$inferSelect;
export type InsertSimplePurchaseOrder = z.infer<typeof simplePurchaseOrderSchema>;

// Workspace settings types
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type InsertWorkspaceSettings = typeof workspaceSettings.$inferInsert;

export const insertWorkspaceSettingsSchema = createInsertSchema(workspaceSettings);

// Analytics data types
export interface AnalyticsSummary {
  sales7d: number;
  sales30d: number[]; // 30 points
  openTasksByType: {
    RESTOCK: number;
    RETRY_SYNC: number;
    RECONCILE: number;
    ADJUST_BUDGET: number;
  };
  openByPriority: {
    P1: number;
    P2: number;
    P3: number;
  };
  stockouts7d: number; // INVENTORY_LOW events with payload.stock==0 in last 7d
  ttrMedianHours: number; // DONE tasks vs their source event
}

// Restock Autopilot schemas
export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  currency: z.enum(["INR", "GBP", "USD", "AED", "SGD"]).default("INR"),
  address: z.string().optional(),
  skus: z.array(z.object({
    sku: z.string().min(1, "SKU is required"),
    unitCost: z.number().min(0, "Unit cost must be positive"),
    packSize: z.number().int().min(1).optional(),
    moq: z.number().int().min(1).optional(),
    leadTimeDays: z.number().int().min(0, "Lead time must be non-negative"),
  })).default([]),
  notes: z.string().optional(),
});

export const reorderPolicySchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  targetDaysCover: z.number().int().min(1, "Target days cover must be positive").default(14),
  safetyDays: z.number().int().min(0, "Safety days must be non-negative").default(3),
  maxDaysCover: z.number().int().min(1).optional(),
});

export const reorderSuggestRequestSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  stock: z.number().int().min(0, "Stock must be non-negative"),
  dailySales: z.number().min(0, "Daily sales must be non-negative"),
});

export interface ReorderSuggestion {
  recommendedQty: number;
  supplier: {
    id: string;
    name: string;
    email?: string;
    currency: string;
  } | null;
  unitCost: number | null;
  leadTimeDays: number | null;
  policy: {
    targetDaysCover: number;
    safetyDays: number;
    maxDaysCover?: number;
  } | null;
  calculation?: {
    currentDaysLeft: number;
    targetDaysNeeded: number;
    shortfall: number;
    roundedToPackSize?: number;
    adjustedForMOQ?: number;
  };
}

// Restock Autopilot V1 - Supplier schema
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  currency: text("currency", { enum: ["INR", "GBP", "USD", "AED", "SGD"] }).notNull().default('INR'),
  address: text("address"),
  skus: jsonb("skus").$type<{
    sku: string;
    unitCost: number;
    packSize?: number;
    moq?: number;
    leadTimeDays: number;
  }[]>().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Reorder Policy schema
export const reorderPolicies = pgTable("reorder_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  sku: text("sku").notNull(),
  targetDaysCover: integer("target_days_cover").notNull().default(14),
  safetyDays: integer("safety_days").notNull().default(3),
  maxDaysCover: integer("max_days_cover"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Restock Autopilot schemas
export const insertSupplierSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  currency: z.enum(["INR", "GBP", "USD", "AED", "SGD"]).default('INR'),
  address: z.string().optional(),
  skus: z.array(z.object({
    sku: z.string().min(1),
    unitCost: z.number().min(0),
    packSize: z.number().int().min(1).optional(),
    moq: z.number().int().min(1).optional(),
    leadTimeDays: z.number().int().min(0)
  })).default([]),
  notes: z.string().optional()
});

export const insertReorderPolicySchema = z.object({
  workspaceId: z.string(),
  sku: z.string().min(1),
  targetDaysCover: z.number().int().min(1).default(14),
  safetyDays: z.number().int().min(0).default(3),
  maxDaysCover: z.number().int().min(1).optional()
});



export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "RECEIVED", "CANCELLED"])
});

// Restock Autopilot types
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type ReorderPolicy = typeof reorderPolicies.$inferSelect;
export type InsertReorderPolicy = z.infer<typeof insertReorderPolicySchema>;
export type ReorderSuggestData = z.infer<typeof reorderSuggestRequestSchema>;
export type UpdatePurchaseOrderStatusData = z.infer<typeof updatePurchaseOrderStatusSchema>;
