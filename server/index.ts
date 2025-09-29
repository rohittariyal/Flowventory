import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { NotificationGenerators } from "./notificationGenerators";
import { syncManager } from "./syncAdapters";
import { digestScheduler } from "./digestScheduler";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { startWebhookProcessor } from "./services/webhooks";

// Import API routes
import apiRoutes from "./routes/api";
import mgmtRoutes from "./routes/mgmt";

// Seed demo users for development
async function seedDemoUsers() {
  try {
    const demoEmail = "john.doe@company.com";
    
    // Check if demo user already exists
    const existingUser = await storage.getUserByUsername(demoEmail);
    if (existingUser) {
      console.log("✅ Demo user already exists:", demoEmail);
      return;
    }
    
    // Create demo user
    const hashedPassword = await hashPassword("password");
    const demoUser = await storage.createUser({
      username: demoEmail,
      email: demoEmail,
      password: hashedPassword,
      fullName: "John Doe",
      companyName: "Demo Company", 
      role: "admin" as const,
    });
    
    // Mark onboarding as complete for demo user to skip onboarding flow
    await storage.updateUserOnboarding(demoUser.id, true);
    
    // Add test alerts for the demo user
    const organizationId = demoUser.organizationId || "sample-org-123";
    await storage.addTestAlertsForUser(demoUser.id, organizationId);
    
    console.log("🎉 Demo user created successfully:", demoEmail);
    console.log("   ID:", demoUser.id);
    console.log("   Role:", demoUser.role);
  } catch (error) {
    console.error("❌ Failed to seed demo users:", error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

  // Mount API routes before main routes
  app.use('/api', apiRoutes);
  app.use('/mgmt', mgmtRoutes);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start notification generators in development
    if (app.get("env") === "development") {
      // Seed demo users automatically on startup
      seedDemoUsers();
      
      // Start periodic checks every 5 minutes for demo purposes
      NotificationGenerators.startPeriodicChecks(5);
      
      // Start auto-sync every 30 minutes (optional cron)
      syncManager.startAutoSync(30);
    }
    
    // Start webhook processor
    startWebhookProcessor();

    // Daily digest scheduler is always running (configured via settings)
    console.log("Daily digest scheduler initialized and running");
    console.log("Digest status:", digestScheduler.getStatus());
  });
})();
