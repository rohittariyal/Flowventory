import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { signPayload, generateWebhookSecret } from './signing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  name?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastStatus?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  failureCount: number;
  workspaceId?: string;
}

export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  eventType: string;
  payload: any;
  url: string;
  attemptNumber: number;
  maxAttempts: number;
  scheduledAt: string;
  attemptedAt?: string;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  nextRetryAt?: string;
}

export interface WebhookEvent {
  id: string;
  event: string;
  timestamp: string;
  data: any;
  workspaceId?: string;
}

const WEBHOOKS_FILE = path.join(__dirname, '../db/webhooks.json');
const WEBHOOK_QUEUE_FILE = path.join(__dirname, '../db/webhook_queue.json');
const WEBHOOK_EVENTS_FILE = path.join(__dirname, '../db/webhook_events.json');

const WEBHOOK_USER_AGENT = process.env.WEBHOOK_USER_AGENT || 'Flowventory-Hook/1.0';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVALS = [60000, 300000, 900000, 3600000, 21600000]; // 1m, 5m, 15m, 1h, 6h

// Initialize webhook files
async function initializeWebhookFiles() {
  for (const file of [WEBHOOKS_FILE, WEBHOOK_QUEUE_FILE, WEBHOOK_EVENTS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([], null, 2));
    }
  }
}

// Load webhooks
export async function loadWebhooks(): Promise<Webhook[]> {
  await initializeWebhookFiles();
  try {
    const data = await fs.readFile(WEBHOOKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save webhooks
async function saveWebhooks(webhooks: Webhook[]) {
  await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
}

// Load webhook queue
async function loadWebhookQueue(): Promise<WebhookDeliveryAttempt[]> {
  await initializeWebhookFiles();
  try {
    const data = await fs.readFile(WEBHOOK_QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save webhook queue
async function saveWebhookQueue(queue: WebhookDeliveryAttempt[]) {
  await fs.writeFile(WEBHOOK_QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// Create webhook
export async function createWebhook(data: {
  url: string;
  events: string[];
  secret?: string;
  name?: string;
  description?: string;
  workspaceId?: string;
}): Promise<Webhook> {
  const webhooks = await loadWebhooks();
  
  const webhook: Webhook = {
    id: crypto.randomUUID(),
    url: data.url,
    secret: data.secret || generateWebhookSecret(),
    events: data.events,
    active: true,
    name: data.name,
    description: data.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failureCount: 0,
    workspaceId: data.workspaceId
  };
  
  webhooks.push(webhook);
  await saveWebhooks(webhooks);
  
  return webhook;
}

// Update webhook
export async function updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | null> {
  const webhooks = await loadWebhooks();
  const index = webhooks.findIndex(w => w.id === id);
  
  if (index === -1) return null;
  
  webhooks[index] = {
    ...webhooks[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await saveWebhooks(webhooks);
  return webhooks[index];
}

// Delete webhook
export async function deleteWebhook(id: string): Promise<boolean> {
  const webhooks = await loadWebhooks();
  const index = webhooks.findIndex(w => w.id === id);
  
  if (index === -1) return false;
  
  webhooks.splice(index, 1);
  await saveWebhooks(webhooks);
  
  return true;
}

// Get webhook by ID
export async function getWebhook(id: string): Promise<Webhook | null> {
  const webhooks = await loadWebhooks();
  return webhooks.find(w => w.id === id) || null;
}

// List webhooks
export async function listWebhooks(workspaceId?: string): Promise<Webhook[]> {
  const webhooks = await loadWebhooks();
  
  if (workspaceId) {
    return webhooks.filter(w => w.workspaceId === workspaceId);
  }
  
  return webhooks;
}

// Trigger webhook event
export async function triggerWebhookEvent(
  eventType: string,
  data: any,
  workspaceId?: string
): Promise<void> {
  const webhooks = await loadWebhooks();
  const activeWebhooks = webhooks.filter(w => 
    w.active && 
    w.events.includes(eventType) &&
    (!workspaceId || w.workspaceId === workspaceId)
  );
  
  if (activeWebhooks.length === 0) {
    console.log(`No active webhooks for event: ${eventType}`);
    return;
  }
  
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
    workspaceId
  };
  
  // Store event
  const events = await loadWebhookEvents();
  events.push(event);
  await saveWebhookEvents(events.slice(-1000)); // Keep last 1000 events
  
  // Queue delivery attempts
  const queue = await loadWebhookQueue();
  
  for (const webhook of activeWebhooks) {
    const attempt: WebhookDeliveryAttempt = {
      id: crypto.randomUUID(),
      webhookId: webhook.id,
      eventType,
      payload: {
        id: event.id,
        event: eventType,
        timestamp: event.timestamp,
        data: event.data
      },
      url: webhook.url,
      attemptNumber: 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      scheduledAt: new Date().toISOString()
    };
    
    queue.push(attempt);
  }
  
  await saveWebhookQueue(queue);
  
  // Start processing queue (don't await)
  processWebhookQueue().catch(error => {
    console.error('Webhook queue processing error:', error);
  });
}

// Process webhook delivery queue
export async function processWebhookQueue(): Promise<void> {
  const queue = await loadWebhookQueue();
  const now = new Date();
  
  const readyAttempts = queue.filter(attempt => {
    if (attempt.attemptedAt && attempt.nextRetryAt) {
      return new Date(attempt.nextRetryAt) <= now;
    }
    return !attempt.attemptedAt;
  });
  
  if (readyAttempts.length === 0) {
    return;
  }
  
  console.log(`Processing ${readyAttempts.length} webhook deliveries`);
  
  for (const attempt of readyAttempts) {
    await deliverWebhook(attempt);
  }
}

// Deliver individual webhook
async function deliverWebhook(attempt: WebhookDeliveryAttempt): Promise<void> {
  try {
    const webhook = await getWebhook(attempt.webhookId);
    if (!webhook || !webhook.active) {
      console.log(`Webhook ${attempt.webhookId} is inactive, skipping delivery`);
      await removeFromQueue(attempt.id);
      return;
    }
    
    const payload = JSON.stringify(attempt.payload);
    const signature = signPayload(payload, webhook.secret);
    
    console.log(`Delivering webhook ${attempt.id} to ${attempt.url} (attempt ${attempt.attemptNumber})`);
    
    const response = await fetch(attempt.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': WEBHOOK_USER_AGENT,
        'X-Flowventory-Event': attempt.eventType,
        'X-Flowventory-Id': attempt.payload.id,
        'X-Flowventory-Signature': `sha256=${signature}`
      },
      body: payload,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    const responseText = await response.text();
    
    // Update attempt
    attempt.attemptedAt = new Date().toISOString();
    attempt.statusCode = response.status;
    attempt.responseBody = responseText.substring(0, 1000); // Limit response body size
    
    if (response.ok) {
      // Success - remove from queue and update webhook
      console.log(`Webhook delivered successfully: ${attempt.id}`);
      await removeFromQueue(attempt.id);
      await updateWebhook(webhook.id, {
        lastStatus: response.status,
        lastAttemptAt: attempt.attemptedAt,
        lastSuccessAt: attempt.attemptedAt,
        failureCount: 0
      });
    } else {
      // Failure - schedule retry or remove if max attempts reached
      console.log(`Webhook delivery failed: ${attempt.id}, status: ${response.status}`);
      await handleWebhookFailure(attempt, webhook);
    }
    
  } catch (error) {
    console.error(`Webhook delivery error for ${attempt.id}:`, error);
    
    const webhook = await getWebhook(attempt.webhookId);
    if (webhook) {
      attempt.attemptedAt = new Date().toISOString();
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      await handleWebhookFailure(attempt, webhook);
    }
  }
}

// Handle webhook delivery failure
async function handleWebhookFailure(attempt: WebhookDeliveryAttempt, webhook: Webhook): Promise<void> {
  if (attempt.attemptNumber >= attempt.maxAttempts) {
    // Max attempts reached, remove from queue
    console.log(`Max attempts reached for webhook ${attempt.id}, removing from queue`);
    await removeFromQueue(attempt.id);
    
    await updateWebhook(webhook.id, {
      lastStatus: attempt.statusCode,
      lastAttemptAt: attempt.attemptedAt,
      failureCount: webhook.failureCount + 1
    });
  } else {
    // Schedule retry
    const retryDelay = RETRY_INTERVALS[Math.min(attempt.attemptNumber - 1, RETRY_INTERVALS.length - 1)];
    const nextRetryAt = new Date(Date.now() + retryDelay);
    
    attempt.attemptNumber++;
    attempt.nextRetryAt = nextRetryAt.toISOString();
    
    console.log(`Scheduling retry for webhook ${attempt.id} at ${nextRetryAt.toISOString()}`);
    
    await updateQueueAttempt(attempt);
    await updateWebhook(webhook.id, {
      lastStatus: attempt.statusCode,
      lastAttemptAt: attempt.attemptedAt,
      failureCount: webhook.failureCount + 1
    });
  }
}

// Remove attempt from queue
async function removeFromQueue(attemptId: string): Promise<void> {
  const queue = await loadWebhookQueue();
  const filteredQueue = queue.filter(a => a.id !== attemptId);
  await saveWebhookQueue(filteredQueue);
}

// Update queue attempt
async function updateQueueAttempt(updatedAttempt: WebhookDeliveryAttempt): Promise<void> {
  const queue = await loadWebhookQueue();
  const index = queue.findIndex(a => a.id === updatedAttempt.id);
  
  if (index !== -1) {
    queue[index] = updatedAttempt;
    await saveWebhookQueue(queue);
  }
}

// Load webhook events
async function loadWebhookEvents(): Promise<WebhookEvent[]> {
  await initializeWebhookFiles();
  try {
    const data = await fs.readFile(WEBHOOK_EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save webhook events
async function saveWebhookEvents(events: WebhookEvent[]) {
  await fs.writeFile(WEBHOOK_EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Test webhook delivery
export async function testWebhook(webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}> {
  const webhook = await getWebhook(webhookId);
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }
  
  const testPayload = {
    id: crypto.randomUUID(),
    event: 'test.webhook',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook delivery',
      webhook_id: webhookId
    }
  };
  
  const startTime = Date.now();
  
  try {
    const payload = JSON.stringify(testPayload);
    const signature = signPayload(payload, webhook.secret);
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': WEBHOOK_USER_AGENT,
        'X-Flowventory-Event': 'test.webhook',
        'X-Flowventory-Id': testPayload.id,
        'X-Flowventory-Signature': `sha256=${signature}`
      },
      body: payload,
      signal: AbortSignal.timeout(30000)
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

// Start webhook queue processor (call this on server startup)
export function startWebhookProcessor(): void {
  // Process queue every minute
  setInterval(async () => {
    try {
      await processWebhookQueue();
    } catch (error) {
      console.error('Webhook queue processing error:', error);
    }
  }, 60000); // 1 minute
  
  console.log('Webhook processor started');
}

// Get webhook statistics
export async function getWebhookStats(): Promise<{
  totalWebhooks: number;
  activeWebhooks: number;
  queueLength: number;
  recentEvents: number;
  avgResponseTime?: number;
}> {
  const webhooks = await loadWebhooks();
  const queue = await loadWebhookQueue();
  const events = await loadWebhookEvents();
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentEvents = events.filter(e => new Date(e.timestamp) > oneHourAgo).length;
  
  return {
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter(w => w.active).length,
    queueLength: queue.length,
    recentEvents
  };
}