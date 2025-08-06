import { type User, type InsertUser, type OnboardingData, type InsertOnboardingData, type PlatformConnections, type Organization, type TeamInvitation, type InviteTeamMemberData, type UpdateTeamMemberData, type Notification, type CreateNotificationData } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

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
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingData: Map<string, OnboardingData>;
  private organizations: Map<string, Organization>;
  private teamInvitations: Map<string, TeamInvitation>;
  private notifications: Map<string, Notification>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.onboardingData = new Map();
    this.organizations = new Map();
    this.teamInvitations = new Map();
    this.notifications = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with some sample notifications
    this.initializeSampleNotifications();
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

  // Add test alerts for a specific user on login
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

    // Add the new test alerts
    testAlerts.forEach(alert => {
      this.notifications.set(alert.id, alert);
    });
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
    return Array.from(this.notifications.values())
      .filter(notification => {
        // Filter by organization
        if (notification.organizationId !== organizationId) return false;
        
        // Filter out expired notifications
        if (notification.expiresAt && notification.expiresAt < now) return false;
        
        // For organization-wide notifications or user-specific notifications
        if (notification.userId === null || notification.userId === userId) {
          // Show only unread notifications or notifications not read by this user
          if (userId && notification.readBy && typeof notification.readBy === 'object' && notification.readBy !== null) {
            const readByRecord = notification.readBy as Record<string, boolean>;
            if (readByRecord[userId]) {
              return false; // User has already read this notification
            }
          }
          return true;
        }
        
        return false;
      })
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()); // Sort by newest first
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
}

export const storage = new MemStorage();
