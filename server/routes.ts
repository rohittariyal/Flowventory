import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { onboardingSchema, platformConnectionSchema, type PlatformConnections } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Onboarding routes
  app.post("/api/onboarding/save", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Onboarding save: User not authenticated");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("Onboarding save: Starting for user", req.user!.id);
      const validatedData = onboardingSchema.parse(req.body);
      const onboardingData = await storage.saveOnboardingData(req.user!.id, validatedData);
      await storage.updateUserOnboarding(req.user!.id, true);
      console.log("Onboarding save: Successfully completed for user", req.user!.id);
      
      res.status(201).json({ 
        message: "Onboarding completed successfully",
        data: onboardingData 
      });
    } catch (error) {
      console.error("Onboarding save error:", error);
      res.status(400).json({ error: "Invalid onboarding data" });
    }
  });

  app.get("/api/onboarding", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const onboardingData = await storage.getOnboardingData(req.user!.id);
      if (!onboardingData) {
        return res.status(404).json({ error: "No onboarding data found" });
      }
      res.json(onboardingData);
    } catch (error) {
      console.error("Onboarding get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/:id/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      const onboardingData = await storage.getOnboardingData(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          companyName: user.companyName,
          role: user.role,
          onboardingComplete: user.onboardingComplete === "true"
        },
        onboardingData
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Platform connection routes
  app.post("/api/platforms/connect", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { platform, apiKey } = platformConnectionSchema.parse(req.body);
      const userId = req.user!.id;

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update platform connections
      const currentConnections = (user.platformConnections as PlatformConnections) || {};
      const updatedConnections = {
        ...currentConnections,
        [platform]: {
          connected: true,
          apiKey: apiKey,
          connectedAt: new Date().toISOString()
        }
      };

      await storage.updateUserPlatformConnections(userId, updatedConnections);

      res.json({ 
        success: true, 
        message: `Successfully connected to ${platform}`,
        platform,
        connected: true 
      });
    } catch (error) {
      console.error("Platform connection error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.post("/api/platforms/disconnect", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { platform } = req.body;
      if (!platform) {
        return res.status(400).json({ error: "Platform name is required" });
      }

      const userId = req.user!.id;

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update platform connections
      const currentConnections = (user.platformConnections as PlatformConnections) || {};
      const updatedConnections = {
        ...currentConnections,
        [platform]: {
          connected: false,
          apiKey: undefined,
          connectedAt: undefined
        }
      };

      await storage.updateUserPlatformConnections(userId, updatedConnections);

      res.json({ 
        success: true, 
        message: `Successfully disconnected from ${platform}`,
        platform,
        connected: false 
      });
    } catch (error) {
      console.error("Platform disconnection error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/platforms/connections", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const connections = (user.platformConnections as PlatformConnections) || {};
      
      // Don't send API keys to frontend, just connection status
      const sanitizedConnections: { [key: string]: { connected: boolean; connectedAt?: string } } = {};
      Object.keys(connections).forEach(platform => {
        sanitizedConnections[platform] = {
          connected: connections[platform].connected,
          connectedAt: connections[platform].connectedAt
        };
      });

      res.json(sanitizedConnections);
    } catch (error) {
      console.error("Platform connections fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
