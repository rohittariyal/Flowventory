import { type User, type InsertUser, type OnboardingData, type InsertOnboardingData, type PlatformConnections, type Organization, type TeamInvitation, type InviteTeamMemberData, type UpdateTeamMemberData } from "@shared/schema";
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
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingData: Map<string, OnboardingData>;
  private organizations: Map<string, Organization>;
  private teamInvitations: Map<string, TeamInvitation>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.onboardingData = new Map();
    this.organizations = new Map();
    this.teamInvitations = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
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
}

export const storage = new MemStorage();
