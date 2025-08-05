import { type User, type InsertUser, type OnboardingData, type InsertOnboardingData } from "@shared/schema";
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
  saveOnboardingData(userId: string, data: InsertOnboardingData): Promise<OnboardingData>;
  getOnboardingData(userId: string): Promise<OnboardingData | undefined>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private onboardingData: Map<string, OnboardingData>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.onboardingData = new Map();
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
    const user: User = { 
      ...insertUser, 
      id,
      username: insertUser.email, // Use email as username
      role: insertUser.role || "viewer", // Ensure role is defined
      onboardingComplete: "false",
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
}

export const storage = new MemStorage();
