import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { syncManager } from "./syncAdapters";
import { onboardingSchema, platformConnectionSchema, createNotificationSchema, markNotificationReadSchema, reconIngestSchema, updateReconRowSchema, insertSupplierSchema, insertReorderPolicySchema, reorderSuggestRequestSchema, updatePurchaseOrderStatusSchema, simplePurchaseOrderSchema, supplierSchema, reorderPolicySchema, type PlatformConnections } from "@shared/schema";
import { ReconciliationService } from "./reconService";
import { ReorderService } from "./reorderService";
import multer from "multer";

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

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

  // Team management routes
  
  // Get team members (Admin: full access, Manager: view only, Viewer: no access)
  app.get("/api/team/members", requireAuth, async (req, res) => {
    const user = req.user;
    if (!user || user.role === "viewer") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!user.organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const members = await storage.getTeamMembers(user.organizationId);
      res.json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Invite team member (Admin only)
  app.post("/api/team/invite", requireAuth, async (req, res) => {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    if (!user.organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const { email, role } = req.body;
      
      // Validate input
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }
      
      if (!["manager", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be manager or viewer" });
      }

      // Check if user already exists in organization
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.organizationId === user.organizationId) {
        return res.status(400).json({ error: "User already exists in organization" });
      }

      const invitation = await storage.inviteTeamMember(
        user.organizationId,
        user.email,
        { email, role }
      );

      res.status(201).json(invitation);
    } catch (error) {
      console.error('Error inviting team member:', error);
      res.status(500).json({ error: "Failed to invite team member" });
    }
  });

  // Update team member role (Admin only)
  app.put("/api/team/members/:userId/role", requireAuth, async (req, res) => {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    if (!user.organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!["manager", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be manager or viewer" });
      }

      const updatedUser = await storage.updateTeamMemberRole(
        user.organizationId,
        { userId, role }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "Team member not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating team member role:', error);
      res.status(500).json({ error: "Failed to update team member role" });
    }
  });

  // Remove team member (Admin only)
  app.delete("/api/team/members/:userId", requireAuth, async (req, res) => {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    if (!user.organizationId) {
      return res.status(400).json({ error: "No organization found" });
    }

    try {
      const { userId } = req.params;
      
      // Prevent admin from removing themselves
      if (userId === user.id) {
        return res.status(400).json({ error: "Cannot remove yourself from the team" });
      }

      await storage.removeTeamMember(user.organizationId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      // Only Admin and Manager can access notifications
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Access denied: Viewers cannot access notifications" });
      }
      
      const organizationId = user.organizationId || "sample-org-123";
      const notifications = await storage.getNotifications(organizationId, user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Viewers cannot create notifications" });
      }

      const organizationId = user.organizationId || "sample-org-123";
      const validatedData = createNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(organizationId, validatedData);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(400).json({ error: "Invalid notification data" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Viewers cannot mark notifications as read" });
      }

      const notificationId = req.params.id;
      await storage.markNotificationAsRead(notificationId, user.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Test endpoint to generate sample alerts
  app.post("/api/notifications/test", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role === "viewer") {
        return res.status(403).json({ error: "Viewers cannot generate test notifications" });
      }

      const organizationId = user.organizationId || "sample-org-123";
      await storage.addTestAlertsForUser(user.id, organizationId);
      res.json({ message: "Test alerts added successfully" });
    } catch (error) {
      console.error("Generate test alerts error:", error);
      res.status(500).json({ error: "Failed to generate test alerts" });
    }
  });

  // Authentication middleware to check if user has admin/manager privileges for Action Center
  const requiresActionCenterAccess = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    const user = req.user;
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return res.sendStatus(403); // Forbidden - viewer role users cannot access Action Center
    }
    
    next();
  };

  // Action Center Events API routes
  app.get("/api/events", requiresActionCenterAccess, async (req, res) => {
    try {
      const { status, type, severity, summary } = req.query;
      const filters = {
        status: status as string,
        type: type as string,
        severity: severity as string,
        summary: summary === "true",
      };
      
      const result = await storage.getEvents(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requiresActionCenterAccess, async (req, res) => {
    try {
      const eventData = req.body;
      const result = await storage.createEvent(eventData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/events/:id", requiresActionCenterAccess, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.patch("/api/events/:id", requiresActionCenterAccess, async (req, res) => {
    try {
      const updatedEvent = await storage.updateEvent(req.params.id, req.body);
      if (!updatedEvent) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Action Center Tasks API routes
  app.get("/api/tasks", requiresActionCenterAccess, async (req, res) => {
    try {
      const { status, assigneeId, type, priority, overdue, poId } = req.query;
      const filters = {
        status: status as string,
        assigneeId: assigneeId as string,
        type: type as string,
        priority: priority as string,
        overdue: overdue === "true",
        poId: poId as string,
      };
      
      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", requiresActionCenterAccess, async (req, res) => {
    try {
      const taskData = req.body;
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.get("/api/tasks/:id", requiresActionCenterAccess, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.patch("/api/tasks/:id", requiresActionCenterAccess, async (req, res) => {
    try {
      const updatedTask = await storage.updateTask(req.params.id, req.body);
      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/resolve", requiresActionCenterAccess, async (req, res) => {
    try {
      const result = await storage.resolveTask(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error resolving task:", error);
      res.status(500).json({ error: "Failed to resolve task" });
    }
  });

  app.post("/api/events/:id/create-task", requiresActionCenterAccess, async (req, res) => {
    try {
      const task = await storage.createTaskFromEvent(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task from event:", error);
      res.status(500).json({ error: "Failed to create task from event" });
    }
  });

  // Sync Adapter Routes - Admin/Manager only
  app.post("/api/sync/shopify", requiresActionCenterAccess, async (req, res) => {
    try {
      const result = await syncManager.syncShopify();
      res.json(result);
    } catch (error) {
      console.error("Shopify sync error:", error);
      res.status(500).json({ error: "Failed to sync Shopify data" });
    }
  });

  app.post("/api/sync/amazon", requiresActionCenterAccess, async (req, res) => {
    try {
      const result = await syncManager.syncAmazon();
      res.json(result);
    } catch (error) {
      console.error("Amazon sync error:", error);
      res.status(500).json({ error: "Failed to sync Amazon data" });
    }
  });

  app.post("/api/sync/meta", requiresActionCenterAccess, async (req, res) => {
    try {
      const result = await syncManager.syncMeta();
      res.json(result);
    } catch (error) {
      console.error("Meta sync error:", error);
      res.status(500).json({ error: "Failed to sync Meta data" });
    }
  });

  app.get("/api/sync/status", requiresActionCenterAccess, async (req, res) => {
    try {
      const { adapter } = req.query;
      const status = syncManager.getSyncStatus(adapter as string);
      res.json(status);
    } catch (error) {
      console.error("Sync status error:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // Task Collaboration routes - Comments and Activity
  app.post("/api/tasks/:id/comments", requiresActionCenterAccess, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Comment message is required" });
      }

      const taskId = req.params.id;
      const authorId = req.user!.id;
      const comment = await storage.createComment(taskId, authorId, { message: message.trim() });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.get("/api/tasks/:id/comments", requiresActionCenterAccess, async (req, res) => {
    try {
      const taskId = req.params.id;
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ error: "Failed to fetch task comments" });
    }
  });

  app.get("/api/tasks/:id/activity", requiresActionCenterAccess, async (req, res) => {
    try {
      const taskId = req.params.id;
      const activity = await storage.getTaskActivity(taskId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching task activity:", error);
      res.status(500).json({ error: "Failed to fetch task activity" });
    }
  });

  // Task Assignment Rules - Admin only
  const requiresAdminAccess = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.sendStatus(403); // Forbidden - only admin can manage rules
    }
    
    next();
  };

  app.get("/api/rules", requiresAdminAccess, async (req, res) => {
    try {
      const rules = await storage.getRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching rules:", error);
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.post("/api/rules", requiresAdminAccess, async (req, res) => {
    try {
      const ruleData = req.body;
      const rule = await storage.createRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating rule:", error);
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  app.delete("/api/rules/:id", requiresAdminAccess, async (req, res) => {
    try {
      const success = await storage.deleteRule(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json({ message: "Rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting rule:", error);
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // Purchase Orders API routes - Admin and Manager only
  app.post("/api/purchase-orders", requiresActionCenterAccess, async (req, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      const poData = {
        ...req.body,
        createdBy: req.user.id,
        organizationId: req.user.organizationId,
      };

      const po = await storage.createPurchaseOrder(poData);
      res.status(201).json(po);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  app.get("/api/purchase-orders", requiresActionCenterAccess, async (req, res) => {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      const { status } = req.query;
      const filters = status ? { status: status as string } : undefined;
      const purchaseOrders = await storage.getPurchaseOrders(req.user.organizationId, filters);
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  // Test endpoint for P1 notification (Admin only)
  app.post("/api/test/p1-notification", requireAuth, async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      // Create a test P1 task to trigger notification
      const testTask = await storage.createTask({
        title: "Test Critical Task - " + new Date().toLocaleTimeString(),
        type: "RESTOCK",
        priority: "P1",
        notes: "This is a test P1 task to verify the notification system is working correctly."
      });
      
      res.json({ 
        message: "Test P1 task created successfully", 
        task: testTask,
        note: "Check console for notification attempt logs"
      });
    } catch (error) {
      console.error("Error creating test P1 task:", error);
      res.status(500).json({ error: "Failed to create test task" });
    }
  });

  // Reconciliation API routes
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: 2
    }
  });
  
  app.post("/api/recon/ingest", requireAuth, upload.fields([
    { name: 'orders', maxCount: 1 },
    { name: 'payouts', maxCount: 1 }
  ]), async (req, res) => {
    console.log('🔄 Reconciliation ingest request started');
    
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      console.log('📁 Files received:', Object.keys(files || {}).join(', '));
      
      // Validate required orders file
      if (!files.orders || !files.orders[0]) {
        console.warn('❌ Missing orders file');
        return res.status(400).json({ error: "Orders file is required" });
      }
      
      const ordersFile = files.orders[0];
      const payoutsFile = files.payouts?.[0] || null;
      
      console.log(`📊 Processing orders file: ${ordersFile.originalname} (${ordersFile.size} bytes)`);
      if (payoutsFile) {
        console.log(`💰 Processing payouts file: ${payoutsFile.originalname} (${payoutsFile.size} bytes)`);
      } else {
        console.log('💰 No payouts file provided, will use default paid=0');
      }
      
      // Validate ingest data with error handling
      let ingestData;
      try {
        ingestData = reconIngestSchema.parse({
          source: req.body.source,
          region: req.body.region,
          periodFrom: req.body.periodFrom,
          periodTo: req.body.periodTo,
        });
        console.log('✅ Ingest data validated:', ingestData);
      } catch (validationError) {
        console.error('❌ Validation error:', validationError);
        return res.status(400).json({ 
          error: "Invalid ingest data",
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        });
      }
      
      // Use user as workspace ID and get base currency
      const workspaceId = req.user!.id;
      const baseCurrency = req.user!.baseCurrency || 'INR';
      
      console.log(`🏢 Processing for workspace: ${workspaceId}, base currency: ${baseCurrency}`);
      
      // Process reconciliation with timeout
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout after 5 minutes')), 5 * 60 * 1000);
      });
      
      const reconciliationPromise = ReconciliationService.ingestReconciliation(
        ordersFile.buffer,
        payoutsFile?.buffer || null,
        ingestData,
        workspaceId,
        baseCurrency
      );
      
      const result = await Promise.race([reconciliationPromise, timeout]);
      
      console.log('🎉 Reconciliation completed successfully');
      res.json(result);
      
    } catch (error) {
      console.error("❌ Reconciliation ingest error:", error);
      
      // Ensure we always send a response
      if (!res.headersSent) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ 
          error: "Failed to process reconciliation data",
          details: errorMessage
        });
      }
    }
  });
  
  app.get("/api/recon/batches", requireAuth, async (req, res) => {
    try {
      const { region, source, limit, offset } = req.query;
      const filters = {
        region: region as string,
        source: source as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };
      
      const batches = await storage.getReconBatches(filters);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching recon batches:", error);
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });
  
  app.get("/api/recon/batches/:id", requireAuth, async (req, res) => {
    try {
      const batch = await storage.getReconBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      const { status, hasDiff, limit, offset } = req.query;
      const filters = {
        status: status as string,
        hasDiff: hasDiff === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };
      
      const rows = await storage.getReconRows(batch.id, filters);
      
      res.json({ batch, rows });
    } catch (error) {
      console.error("Error fetching recon batch:", error);
      res.status(500).json({ error: "Failed to fetch batch details" });
    }
  });
  
  app.post("/api/recon/rows/:rowId/create-task", requireAuth, async (req, res) => {
    try {
      const row = await storage.getReconRow(req.params.rowId);
      if (!row) {
        return res.status(404).json({ error: "Reconciliation row not found" });
      }
      
      // Check if task already exists
      if (row.notes && row.notes.includes('Task:')) {
        return res.json({ message: "Task already exists for this row", row });
      }
      
      // Create RECONCILE task
      const task = await storage.createTask({
        title: `Reconcile payment mismatch for order ${row.orderId}`,
        type: "RECONCILE",
        priority: Math.abs(row.diffBase) > 1000 ? "P1" : "P2", // > $10 = P1
        notes: `Payment mismatch: Expected ${row.expectedNet/100} ${row.currency}, Paid ${row.paid/100} ${row.currency}`,
      });
      
      // Update row with task reference
      const updatedRow = await storage.updateReconRow(row.id, {
        notes: `${row.notes || ''} Task: ${task.id}`.trim()
      });
      
      res.json({ task, row: updatedRow });
    } catch (error) {
      console.error("Error creating task for recon row:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  
  app.patch("/api/recon/rows/:rowId", requireAuth, async (req, res) => {
    try {
      const updates = updateReconRowSchema.parse(req.body);
      const updatedRow = await storage.updateReconRow(req.params.rowId, updates);
      
      if (!updatedRow) {
        return res.status(404).json({ error: "Reconciliation row not found" });
      }
      
      res.json(updatedRow);
    } catch (error) {
      console.error("Error updating recon row:", error);
      res.status(500).json({ error: "Failed to update reconciliation row" });
    }
  });

  // Update batch notes (UX polish)
  app.patch("/api/recon/batches/:batchId", requireAuth, async (req, res) => {
    try {
      const { notes } = req.body;
      const updatedBatch = await storage.updateReconBatch(req.params.batchId, { notes });
      
      if (!updatedBatch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error updating batch notes:", error);
      res.status(500).json({ error: "Failed to update batch notes" });
    }
  });

  // Export mismatches CSV
  app.get("/api/recon/batches/:batchId/export", requireAuth, async (req, res) => {
    try {
      const batch = await storage.getReconBatch(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      // Get only mismatches
      const rows = await storage.getReconRows(batch.id, { hasDiff: true });
      
      if (rows.length === 0) {
        return res.status(400).json({ error: "No mismatches found to export" });
      }
      
      // Generate CSV content
      const csvHeaders = [
        'Order ID',
        'Currency',
        'Gross',
        'Fees',
        'Tax',
        'Expected Net',
        'Paid',
        'Difference',
        `Difference (${batch.baseCurrency})`,
        'Status',
        'Notes'
      ];
      
      const csvRows = rows.map(row => [
        row.orderId,
        row.currency,
        (row.gross / 100).toFixed(2),
        (row.fees / 100).toFixed(2),
        (row.tax / 100).toFixed(2),
        (row.expectedNet / 100).toFixed(2),
        (row.paid / 100).toFixed(2),
        (row.diff / 100).toFixed(2),
        (row.diffBase / 100).toFixed(2),
        row.status,
        row.notes || ''
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      const filename = `${batch.source}_${batch.region}_mismatches_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting mismatches:", error);
      res.status(500).json({ error: "Failed to export mismatches" });
    }
  });

  // Restock Autopilot V1 - Supplier API routes
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { sku } = req.query;
      
      const filters = sku ? { sku: sku as string } : undefined;
      const suppliers = await storage.getSuppliers(workspaceId, filters);
      
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const supplierData = {
        ...req.body,
        workspaceId
      };

      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ error: "Failed to create supplier" });
    }
  });

  app.get("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // SLA Tracking API endpoints
  app.get("/api/suppliers/metrics", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const metrics = await storage.getSupplierSLAMetrics(workspaceId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching SLA metrics:", error);
      res.status(500).json({ error: "Failed to fetch SLA metrics" });
    }
  });

  app.post("/api/suppliers/:id/deliveries", requireAuth, async (req, res) => {
    try {
      const { id: supplierId } = req.params;
      const deliveryData = {
        ...req.body,
        supplierId,
      };
      
      const delivery = await storage.createSupplierDelivery(deliveryData);
      res.status(201).json(delivery);
    } catch (error) {
      console.error("Error creating supplier delivery:", error);
      res.status(500).json({ error: "Failed to create delivery record" });
    }
  });

  app.put("/api/suppliers/deliveries/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const delivery = await storage.updateSupplierDelivery(id, updates);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      res.json(delivery);
    } catch (error) {
      console.error("Error updating supplier delivery:", error);
      res.status(500).json({ error: "Failed to update delivery" });
    }
  });

  app.get("/api/suppliers/:id/deliveries", requireAuth, async (req, res) => {
    try {
      const { id: supplierId } = req.params;
      const deliveries = await storage.getSupplierDeliveries(supplierId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching supplier deliveries:", error);
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  // Customer API routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { search, company } = req.query;
      
      const filters = {
        search: search as string,
        company: company as string,
      };
      
      const customers = await storage.getCustomers(workspaceId, filters);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const customerData = {
        ...req.body,
        workspaceId
      };

      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Failed to create customer" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.get("/api/customers/:id/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getCustomerOrders(req.params.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ error: "Failed to fetch customer orders" });
    }
  });

  // Sales Order API routes
  app.get("/api/sales-orders", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { customerId, status } = req.query;
      
      const filters = {
        customerId: customerId as string,
        status: status as string,
      };
      
      const orders = await storage.getSalesOrders(workspaceId, filters);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      res.status(500).json({ error: "Failed to fetch sales orders" });
    }
  });

  app.post("/api/sales-orders", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const orderData = {
        ...req.body,
        workspaceId
      };

      const order = await storage.createSalesOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating sales order:", error);
      res.status(400).json({ error: "Failed to create sales order" });
    }
  });

  app.get("/api/sales-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getSalesOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Sales order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching sales order:", error);
      res.status(500).json({ error: "Failed to fetch sales order" });
    }
  });

  app.put("/api/sales-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.updateSalesOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ error: "Sales order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(500).json({ error: "Failed to update sales order" });
    }
  });

  app.delete("/api/sales-orders/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSalesOrder(req.params.id);
      res.json({ message: "Sales order deleted successfully" });
    } catch (error) {
      console.error("Error deleting sales order:", error);
      res.status(500).json({ error: "Failed to delete sales order" });
    }
  });

  // Restock Autopilot - Reorder Policy API routes
  app.get("/api/reorder/policy", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { sku } = req.query;
      
      if (!sku) {
        return res.status(400).json({ error: "SKU is required" });
      }
      
      const policy = await storage.getReorderPolicy(workspaceId, sku as string);
      res.json(policy);
    } catch (error) {
      console.error("Error fetching reorder policy:", error);
      res.status(500).json({ error: "Failed to fetch reorder policy" });
    }
  });

  app.post("/api/reorder/policy", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const policyData = {
        ...req.body,
        workspaceId
      };

      const policy = await storage.createReorderPolicy(policyData);
      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating reorder policy:", error);
      res.status(400).json({ error: "Failed to create reorder policy" });
    }
  });

  // Restock Autopilot - Reorder Suggestion API route
  app.post("/api/reorder/suggest", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { sku, stock, dailySales, supplierId } = req.body;

      if (!sku || stock === undefined || dailySales === undefined) {
        return res.status(400).json({ error: "SKU, stock, and dailySales are required" });
      }

      // Find supplier (use provided or find first one with this SKU)
      let supplier;
      if (supplierId) {
        supplier = await storage.getSupplier(supplierId);
      } else {
        const suppliers = await storage.getSuppliers(workspaceId, { sku });
        supplier = suppliers[0];
      }

      if (!supplier) {
        return res.status(404).json({ error: "No supplier found for this SKU" });
      }

      // Find SKU data from supplier
      const skuData = supplier.skus.find(s => s.sku === sku);
      if (!skuData) {
        return res.status(404).json({ error: "SKU not found in supplier catalog" });
      }

      // Get or create default reorder policy
      let policy = await storage.getReorderPolicy(workspaceId, sku);
      if (!policy) {
        policy = await storage.createReorderPolicy({
          workspaceId,
          sku,
          targetDaysCover: 14,
          safetyDays: 3
        });
      }

      // Import ReorderService for calculation
      const { ReorderService } = await import("./reorderService");

      // Calculate suggestion using basic logic
      const leadTimeStock = dailySales * skuData.leadTimeDays;
      const safetyStock = dailySales * policy.safetyDays;
      const targetStock = dailySales * policy.targetDaysCover;
      const reorderPoint = leadTimeStock + safetyStock;
      
      let recommendedQty = Math.max(0, targetStock - stock);
      
      // Apply MOQ and pack size constraints
      if (skuData.moq && recommendedQty > 0 && recommendedQty < skuData.moq) {
        recommendedQty = skuData.moq;
      }
      if (skuData.packSize && recommendedQty > 0) {
        recommendedQty = Math.ceil(recommendedQty / skuData.packSize) * skuData.packSize;
      }

      const suggestion = {
        sku,
        recommendedQty,
        reorderPoint,
        reasoning: stock < reorderPoint ? 'Below reorder point' : 'Stock optimization',
        daysOfStockAfterReorder: stock + recommendedQty > 0 ? (stock + recommendedQty) / dailySales : 0
      };

      // Calculate cost estimate
      const subtotal = recommendedQty * skuData.unitCost;
      const costEstimate = {
        subtotal,
        tax: 0,
        total: subtotal,
        currency: supplier.currency
      };

      res.json({
        ...suggestion,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          currency: supplier.currency,
          email: supplier.email
        },
        skuData,
        policy,
        costEstimate
      });
    } catch (error) {
      console.error("Error generating reorder suggestion:", error);
      res.status(500).json({ error: "Failed to generate reorder suggestion" });
    }
  });

  // Restock Autopilot - Purchase Order API routes
  app.post("/api/po", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      
      const { supplierId, currency, items, notes } = req.body;

      if (!supplierId || !currency || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "supplierId, currency, and items are required" });
      }

      // Get supplier details
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      // Calculate totals for all items
      let subtotal = 0;
      let tax = 0;
      const processedItems = items.map(item => {
        const itemSubtotal = item.qty * item.unitCost;
        const itemTax = itemSubtotal * ((item.taxRate || 0) / 100);
        const itemTotal = itemSubtotal + itemTax;
        
        subtotal += itemSubtotal;
        tax += itemTax;
        
        return {
          ...item,
          subtotal: Math.round(itemSubtotal * 100) / 100,
          taxAmount: Math.round(itemTax * 100) / 100,
          total: Math.round(itemTotal * 100) / 100
        };
      });

      const grandTotal = subtotal + tax;

      // Create PO
      const poData = {
        workspaceId,
        supplierId,
        supplierName: supplier.name,
        supplierEmail: supplier.email || undefined,
        currency,
        status: "DRAFT" as const,
        items: processedItems,
        totals: {
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100
        },
        notes
      };

      const po = await storage.createPurchaseOrder(poData);

      // Create RESTOCK task (idempotent)
      const taskData = {
        title: `Process PO for ${supplier.name}`,
        description: `Review and process purchase order ${po.id} with ${items.length} items`,
        type: "RESTOCK" as const,
        priority: "P2" as const,
        status: "TODO" as const,
        assigneeId: user.id,
        sourceEventId: undefined, // Could link to inventory low events if available
        metadata: {
          purchaseOrderId: po.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          totalAmount: grandTotal,
          currency,
          itemCount: items.length
        },
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };

      const task = await storage.createTask(taskData);

      // Link task to PO
      const updatedPO = await storage.updatePurchaseOrder(po.id, { linkedTaskId: task.id });

      res.status(201).json({
        po: updatedPO,
        task
      });
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: "Failed to create purchase order" });
    }
  });

  app.get("/api/po", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const workspaceId = user.organizationId || user.id;
      const { status } = req.query;
      
      const filters = status ? { status: status as string } : undefined;
      const pos = await storage.getPurchaseOrders(workspaceId, filters);
      
      res.json(pos);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/po/:id", requireAuth, async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  app.patch("/api/po/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!["DRAFT", "SENT", "RECEIVED", "CANCELLED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const po = await storage.updatePurchaseOrder(req.params.id, { status });
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // TODO: If status is SENT and email config exists, send email notification

      res.json(po);
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      res.status(500).json({ error: "Failed to update purchase order status" });
    }
  });

  // Simple Purchase Orders for manual restock feature (public endpoints)
  app.get("/api/simple-po/health", (req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/simple-po", async (req, res) => {
    try {
      const { sku, qty, supplierName } = req.body || {};
      
      if (!sku || !qty || !supplierName) {
        return res.status(400).json({ error: "Missing sku/qty/supplierName" });
      }

      const poData = {
        sku,
        qty: Number(qty),
        supplierName,
      };

      const po = await storage.createSimplePurchaseOrder(poData);
      console.log("[PO] created", po.id, sku, qty, supplierName);
      
      res.status(201).json(po);
    } catch (error) {
      console.error("[PO] create error", error);
      res.status(500).json({ error: "PO create failed", detail: String((error as any)?.message || error) });
    }
  });

  app.get("/api/simple-po", async (req, res) => {
    try {
      const pos = await storage.getSimplePurchaseOrders();
      res.json(pos);
    } catch (error) {
      console.error("Error fetching simple purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  // PATCH /api/simple-po/:id for status updates
  app.patch("/api/simple-po/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["DRAFT", "SENT", "RECEIVED", "CANCELLED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be DRAFT, SENT, RECEIVED, or CANCELLED" });
      }

      const updatedPo = await storage.updateSimplePurchaseOrderStatus(id, status);
      console.log("[PO] status updated", id, "->", status);
      
      res.json(updatedPo);
    } catch (error) {
      console.error("[PO] status update error", error);
      res.status(500).json({ error: "Failed to update PO status", detail: String((error as any)?.message || error) });
    }
  });

  // Comprehensive Settings API Routes
  // GET /api/settings - Fetch full settings (workspace + regions + notifications)
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "test-org-id";
      
      // Get or create workspace settings
      let workspace = await storage.getWorkspaceSettings(organizationId);
      if (!workspace) {
        workspace = await storage.createWorkspaceSettings(organizationId, {
          organizationId,
          orgName: "My Organization",
          defaultCurrency: "USD", 
          defaultTimezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          numberFormat: "US"
        });
      }

      // Get regions and notifications
      const regions = await storage.getRegions(organizationId);
      let notifications = await storage.getNotificationSettings(organizationId);
      if (!notifications) {
        notifications = await storage.createNotificationSettings(organizationId, {
          organizationId,
          dailyDigestEnabled: "true",
          digestTime: "09:00",
          alertsEnabled: "true"
        });
      }

      res.json({
        workspace,
        regions,
        notifications
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // PUT /api/settings - Update workspace settings
  app.put("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "test-org-id";
      const updates = req.body;
      
      const updatedSettings = await storage.updateWorkspaceSettings(organizationId, updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Regions API
  app.get("/api/regions", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "test-org-id";
      
      const regions = await storage.getRegions(organizationId);
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.post("/api/regions", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "test-org-id";
      
      const regionData = { ...req.body, organizationId };
      const newRegion = await storage.createRegion(organizationId, regionData);
      res.status(201).json(newRegion);
    } catch (error) {
      console.error("Error creating region:", error);
      res.status(500).json({ error: "Failed to create region" });
    }
  });

  app.put("/api/regions/:id", requireAuth, async (req, res) => {
    try {
      const regionId = req.params.id;
      const updates = req.body;
      
      const updatedRegion = await storage.updateRegion(regionId, updates);
      res.json(updatedRegion);
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(500).json({ error: "Failed to update region" });
    }
  });

  app.delete("/api/regions/:id", requireAuth, async (req, res) => {
    try {
      const regionId = req.params.id;
      
      await storage.deleteRegion(regionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting region:", error);
      res.status(500).json({ error: "Failed to delete region" });
    }
  });

  // Notification Settings API  
  app.put("/api/settings/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "test-org-id";
      const updates = req.body;
      
      const updatedNotifications = await storage.updateNotificationSettings(organizationId, updates);
      res.json(updatedNotifications);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // Mock FX Helper for testing (exposed but not implemented)
  app.get("/api/fx/rates", requireAuth, async (req, res) => {
    try {
      // Mock FX rates for testing
      res.json({
        base: "USD",
        rates: {
          "USD": 1.0,
          "EUR": 0.85,
          "GBP": 0.73,
          "INR": 83.12,
          "AED": 3.67,
          "SGD": 1.35
        },
        lastUpdated: new Date().toISOString(),
        source: "mock"
      });
    } catch (error) {
      console.error("Error fetching FX rates:", error);
      res.status(500).json({ error: "Failed to fetch FX rates" });
    }
  });

  const httpServer = createServer(app);

  // Analytics V1 API
  app.get("/api/analytics/summary", requireAuth, async (req, res) => {
    try {
      const { AnalyticsService } = await import("./analyticsService");
      const analyticsService = new AnalyticsService(storage);
      const user = req.user as any;
      const organizationId = user?.organizationId || "sample-org-123";
      const summary = await analyticsService.getAnalyticsSummary(organizationId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });

  // Workspace Settings API
  app.get("/api/workspace/me", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "sample-org-123";
      let settings = await storage.getWorkspaceSettings(organizationId);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createWorkspaceSettings(organizationId, {
          organizationId,
          orgName: "My Organization",
          defaultCurrency: "USD",
          defaultTimezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          numberFormat: "US"
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching workspace settings:", error);
      res.status(500).json({ error: "Failed to fetch workspace settings" });
    }
  });

  app.patch("/api/workspace", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user?.organizationId || "sample-org-123";
      const updateData = req.body;
      
      console.log("🔧 Workspace settings update request:");
      console.log("  organizationId:", organizationId);
      console.log("  updateData:", JSON.stringify(updateData, null, 2));
      
      // Validate update data structure
      if (!updateData || typeof updateData !== 'object') {
        console.error("❌ Invalid update data structure");
        return res.status(400).json({ error: "Invalid update data" });
      }
      
      const updatedSettings = await storage.updateWorkspaceSettings(organizationId, updateData);
      console.log("✅ Workspace settings updated successfully");
      res.json(updatedSettings);
    } catch (error) {
      console.error("❌ Error updating workspace settings:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ 
        error: "Failed to update workspace settings",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Initialize reorder service
  const reorderService = new ReorderService(storage);

  // Enhanced Supplier CRUD routes with comprehensive data
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = user?.organizationId || "sample-org-123";
      
      // Enhanced mock suppliers data
      const mockSuppliers = [
        {
          id: "sup_001",
          workspaceId: workspaceId,
          name: "ABC Exports (India)",
          email: "orders@abcexports.in",
          phone: "+91 98765 43210",
          region: "India",
          currency: "USD",
          leadTimeDays: 12,
          paymentTerms: "Net 30",
          address: "Mumbai, Maharashtra, India",
          status: "active",
          notes: "Reliable supplier for electronics with competitive pricing",
          skus: [
            { sku: "ELEC-TAB-001", unitCost: 20000, leadTimeDays: 12, packSize: 10, moq: 50 }
          ],
          createdAt: "2024-01-10T10:00:00Z",
          updatedAt: "2024-01-15T14:30:00Z"
        },
        {
          id: "sup_002", 
          workspaceId: workspaceId,
          name: "FastShip UK Ltd",
          email: "procurement@fastship.co.uk",
          phone: "+44 20 7946 0958",
          region: "UK",
          currency: "GBP",
          leadTimeDays: 5,
          paymentTerms: "Net 15",
          address: "London, UK",
          status: "active",
          notes: "Premium supplier with fastest delivery times in Europe",
          skus: [
            { sku: "FASH-TEE-001", unitCost: 2000, leadTimeDays: 5, packSize: 20, moq: 100 }
          ],
          createdAt: "2024-01-08T09:15:00Z",
          updatedAt: "2024-01-18T11:45:00Z"
        },
        {
          id: "sup_003",
          workspaceId: workspaceId,
          name: "Pacific Imports LLC",
          email: "sales@pacificimports.com",
          phone: "+1 555 123 4567",
          region: "US",
          currency: "USD",
          leadTimeDays: 7,
          paymentTerms: "Net 30",
          address: "Los Angeles, CA, USA",
          status: "active",
          notes: "West Coast distributor with excellent inventory levels",
          skus: [
            { sku: "HOME-CAN-002", unitCost: 3500, leadTimeDays: 7, packSize: 12, moq: 24 }
          ],
          createdAt: "2024-01-12T16:20:00Z",
          updatedAt: "2024-01-20T08:10:00Z"
        }
      ];

      res.json(mockSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = user?.organizationId || "sample-org-123";
      
      const {
        name,
        email,
        phone,
        region = "US",
        currency = "USD", 
        leadTimeDays = 7,
        paymentTerms = "Net 30",
        notes = ""
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Supplier name is required" });
      }

      const newSupplier = {
        id: `sup_${Date.now()}`,
        workspaceId,
        name,
        email,
        phone,
        region,
        currency,
        leadTimeDays,
        paymentTerms,
        address: "",
        status: "active",
        notes,
        skus: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ error: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = req.params.id;
      const updates = req.body;

      const updatedSupplier = {
        id: supplierId,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedSupplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(400).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const supplierId = req.params.id;
      res.json({ success: true, message: "Supplier archived successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Reorder Policy routes
  app.post("/api/reorder/policy", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = user?.organizationId || "sample-org-123";
      
      const validatedData = reorderPolicySchema.parse(req.body);
      
      // Check if policy already exists for this SKU
      const existingPolicy = await storage.getReorderPolicy(workspaceId, validatedData.sku);
      
      if (existingPolicy) {
        // Update existing policy
        const updatedPolicy = await storage.updateReorderPolicy(workspaceId, validatedData.sku, validatedData);
        res.json(updatedPolicy);
      } else {
        // Create new policy
        const policyData = {
          ...validatedData,
          workspaceId,
        };
        const policy = await storage.createReorderPolicy(policyData);
        res.status(201).json(policy);
      }
    } catch (error) {
      console.error("Error upserting reorder policy:", error);
      res.status(400).json({ error: "Failed to save reorder policy" });
    }
  });

  app.get("/api/reorder/policy/:sku", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = user?.organizationId || "sample-org-123";
      const { sku } = req.params;
      
      const policy = await storage.getReorderPolicy(workspaceId, sku);
      if (!policy) {
        return res.status(404).json({ error: "Reorder policy not found" });
      }
      
      res.json(policy);
    } catch (error) {
      console.error("Error fetching reorder policy:", error);
      res.status(500).json({ error: "Failed to fetch reorder policy" });
    }
  });

  // Reorder Suggestion route
  app.post("/api/reorder/suggest", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = user?.organizationId || "sample-org-123";
      
      const validatedData = reorderSuggestRequestSchema.parse(req.body);
      const suggestion = await reorderService.generateSuggestion(workspaceId, validatedData);
      
      res.json(suggestion);
    } catch (error) {
      console.error("Error generating reorder suggestion:", error);
      res.status(400).json({ error: "Failed to generate reorder suggestion" });
    }
  });

  // Daily digest preview endpoint
  app.get("/api/digest/preview", requireAuth, (req, res) => {
    try {
      const { buildDigestPayload } = require('./digestService');
      const digestData = buildDigestPayload();
      res.json(digestData);
    } catch (error) {
      console.error("Error generating digest preview:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send digest email endpoint
  app.post("/api/digest/send", requireAuth, async (req, res) => {
    try {
      const { recipients, smtpSettings } = req.body;
      
      if (!recipients || recipients.length === 0) {
        return res.status(400).json({ error: "No recipients specified" });
      }

      if (!smtpSettings?.smtpHost || !smtpSettings?.username || !smtpSettings?.password) {
        return res.status(400).json({ error: "SMTP configuration incomplete" });
      }

      const { sendDigestEmail } = require('./digestService');
      const success = await sendDigestEmail(recipients, smtpSettings);
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Daily digest sent successfully",
          recipients: recipients,
          sentAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ error: "Failed to send digest email" });
      }
    } catch (error) {
      console.error("Error sending digest:", error);
      res.status(500).json({ error: "Failed to send digest" });
    }
  });

  // Send test email endpoint
  app.post("/api/email/test", requireAuth, async (req, res) => {
    try {
      const { smtpSettings, recipients } = req.body;
      
      if (!recipients || recipients.length === 0) {
        return res.status(400).json({ error: "No recipients specified" });
      }

      if (!smtpSettings?.smtpHost || !smtpSettings?.username || !smtpSettings?.password) {
        return res.status(400).json({ 
          error: "SMTP configuration incomplete",
          message: "Please configure SMTP host, username, and password" 
        });
      }

      const { sendTestEmail } = require('./digestService');
      const success = await sendTestEmail(recipients, smtpSettings);
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully",
          recipients: recipients,
          sentAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Update digest scheduler configuration
  app.post("/api/digest/configure", requireAuth, async (req, res) => {
    try {
      const { enabled, time, recipients, smtpSettings } = req.body;
      
      const { digestScheduler } = require('./digestScheduler');
      digestScheduler.updateConfig({
        enabled,
        time,
        recipients,
        smtpSettings
      });
      
      res.json({ 
        success: true, 
        message: "Digest scheduler configured successfully",
        status: digestScheduler.getStatus()
      });
    } catch (error) {
      console.error("Error configuring digest scheduler:", error);
      res.status(500).json({ error: "Failed to configure digest scheduler" });
    }
  });

  // Get digest scheduler status
  app.get("/api/digest/status", requireAuth, (req, res) => {
    try {
      const { digestScheduler } = require('./digestScheduler');
      res.json(digestScheduler.getStatus());
    } catch (error) {
      console.error("Error getting digest status:", error);
      res.status(500).json({ error: "Failed to get digest status" });
    }
  });

  // Returns & RMA API endpoints
  
  // Get all returns for the organization
  app.get("/api/returns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      // Mock data for now - replace with actual database query
      const mockReturns = [
        {
          id: "ret_001",
          rmaId: "RMA-2024-001",
          customerName: "Sarah Johnson",
          customerEmail: "sarah.johnson@email.com",
          orderReference: "ORD-2024-0847",
          items: [
            { sku: "ELEC-TAB-001", productName: "Samsung Galaxy Tab A8", quantity: 1, unitPrice: 25000 }
          ],
          reason: "damaged",
          reasonDescription: "Screen cracked during shipping",
          status: "in_transit",
          totalValue: 25000,
          currency: "USD",
          resolution: "none",
          inspectionNotes: null,
          inspectionPhotos: [],
          createdAt: "2024-01-15T10:30:00Z",
          updatedAt: "2024-01-16T14:20:00Z"
        },
        {
          id: "ret_002",
          rmaId: "RMA-2024-002",
          customerName: "Mike Chen",
          customerEmail: "mike.chen@email.com",
          orderReference: "ORD-2024-0823",
          items: [
            { sku: "FASH-TEE-001", productName: "Organic Cotton T-Shirt", quantity: 2, unitPrice: 2500 }
          ],
          reason: "wrong_item",
          reasonDescription: "Received size Large instead of Medium",
          status: "resolved",
          totalValue: 5000,
          currency: "USD",
          resolution: "replace",
          inspectionNotes: "Items in perfect condition, wrong size shipped",
          inspectionPhotos: [],
          createdAt: "2024-01-10T16:45:00Z",
          updatedAt: "2024-01-18T11:30:00Z"
        },
        {
          id: "ret_003",
          rmaId: "RMA-2024-003",
          customerName: "Emma Wilson",
          customerEmail: "emma.wilson@email.com",
          orderReference: "ORD-2024-0956",
          items: [
            { sku: "HOME-CAN-002", productName: "Scented Candle Set", quantity: 1, unitPrice: 4500 }
          ],
          reason: "customer_remorse",
          reasonDescription: "Changed mind about fragrance",
          status: "requested",
          totalValue: 4500,
          currency: "USD",
          resolution: "none",
          inspectionNotes: null,
          inspectionPhotos: [],
          createdAt: "2024-01-18T09:15:00Z",
          updatedAt: "2024-01-18T09:15:00Z"
        }
      ];
      
      res.json(mockReturns);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ error: "Failed to fetch returns" });
    }
  });

  // Create a new return
  app.post("/api/returns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      const {
        customerName,
        customerEmail,
        orderReference,
        items,
        reason,
        reasonDescription,
        totalValue,
        currency = "USD"
      } = req.body;

      // Generate RMA ID
      const rmaId = `RMA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(3, '0')}`;
      
      const newReturn = {
        id: `ret_${Date.now()}`,
        rmaId,
        organizationId,
        customerName,
        customerEmail,
        orderReference,
        items,
        reason,
        reasonDescription,
        status: "requested",
        totalValue,
        currency,
        resolution: "none",
        inspectionNotes: null,
        inspectionPhotos: [],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // In production, save to database
      // const savedReturn = await storage.createReturn(newReturn);
      
      res.status(201).json(newReturn);
    } catch (error) {
      console.error("Error creating return:", error);
      res.status(500).json({ error: "Failed to create return" });
    }
  });

  // Update return status and details
  app.put("/api/returns/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const returnId = req.params.id;
      const updates = req.body;

      // In production, update in database with validation
      const updatedReturn = {
        id: returnId,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      res.json(updatedReturn);
    } catch (error) {
      console.error("Error updating return:", error);
      res.status(500).json({ error: "Failed to update return" });
    }
  });

  // Get returns settings for organization
  app.get("/api/settings/returns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      // Mock settings - replace with database query
      const mockSettings = {
        returnWindowDays: 30,
        allowExchanges: true,
        autoApproveThreshold: 5000, // $50.00 in cents
        currency: "USD"
      };
      
      res.json(mockSettings);
    } catch (error) {
      console.error("Error fetching returns settings:", error);
      res.status(500).json({ error: "Failed to fetch returns settings" });
    }
  });

  // Update returns settings
  app.post("/api/settings/returns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      const settings = req.body;
      
      // In production, save to database
      // const savedSettings = await storage.updateReturnsSettings(organizationId, settings);
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating returns settings:", error);
      res.status(500).json({ error: "Failed to update returns settings" });
    }
  });

  // Get supplier statistics for dashboard widgets  
  app.get("/api/suppliers/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      // Mock supplier stats with realistic data
      const mockStats = {
        topSuppliers: [
          { name: "ABC Exports (India)", poCount: 8 },
          { name: "FastShip UK Ltd", poCount: 6 },
          { name: "Pacific Imports LLC", poCount: 4 },
          { name: "Global Trade Co", poCount: 3 },
          { name: "Euroline Supplies", poCount: 2 }
        ],
        avgLeadTime: 8, // Average across all suppliers
        pendingPOs: 12 // Total pending purchase orders
      };
      
      res.json(mockStats);
    } catch (error) {
      console.error("Error fetching supplier stats:", error);
      res.status(500).json({ error: "Failed to fetch supplier stats" });
    }
  });

  // Get suppliers settings
  app.get("/api/settings/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      // Mock supplier settings - replace with database query
      const mockSettings = {
        defaultCurrency: "USD",
        defaultPaymentTerms: "Net 30",
        defaultLeadTimeDays: 7,
        autoCreatePOsEnabled: false
      };
      
      res.json(mockSettings);
    } catch (error) {
      console.error("Error fetching supplier settings:", error);
      res.status(500).json({ error: "Failed to fetch supplier settings" });
    }
  });

  // Update suppliers settings
  app.post("/api/settings/suppliers", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;
      
      const settings = req.body;
      
      // In production, save to database
      // const savedSettings = await storage.updateSupplierSettings(organizationId, settings);
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating supplier settings:", error);
      res.status(500).json({ error: "Failed to update supplier settings" });
    }
  });

  return httpServer;
}
