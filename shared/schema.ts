import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  invitedBy: text("invited_by"), // Email of admin who invited them
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
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
