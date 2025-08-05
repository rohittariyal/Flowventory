import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { onboardingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Onboarding routes
  app.post("/api/onboarding/save", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const validatedData = onboardingSchema.parse(req.body);
      const onboardingData = await storage.saveOnboardingData(req.user!.id, validatedData);
      await storage.updateUserOnboarding(req.user!.id, true);
      
      res.status(201).json({ 
        message: "Onboarding completed successfully",
        data: onboardingData 
      });
    } catch (error) {
      console.error("Onboarding save error:", error);
      res.status(400).json({ error: "Invalid onboarding data" });
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

  const httpServer = createServer(app);

  return httpServer;
}
