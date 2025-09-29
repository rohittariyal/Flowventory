import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  keyPrefix?: string;
  keyId?: string;
  ip: string;
  userAgent?: string;
  method: string;
  path: string;
  query?: string;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
  requestBody?: any;
  responseSize?: number;
}

const AUDIT_LOG_FILE = path.join(__dirname, '../db/audit.json');
const MAX_LOG_ENTRIES = 10000; // Keep last 10k entries

// Initialize audit log file
async function initializeAuditFile() {
  try {
    await fs.access(AUDIT_LOG_FILE);
  } catch {
    await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify([], null, 2));
  }
}

// Load audit logs
async function loadAuditLogs(): Promise<AuditLogEntry[]> {
  await initializeAuditFile();
  try {
    const data = await fs.readFile(AUDIT_LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save audit logs with rotation
async function saveAuditLogs(logs: AuditLogEntry[]) {
  // Keep only the most recent entries
  const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
  await fs.writeFile(AUDIT_LOG_FILE, JSON.stringify(trimmedLogs, null, 2));
}

// Generate unique ID for each request
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get client IP address
function getClientIp(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Serialize request body safely
function serializeRequestBody(body: any): any {
  if (!body) return undefined;
  
  try {
    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'secret', 'token', 'key'];
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    };
    
    return sanitizeObject(sanitized);
  } catch {
    return '[SERIALIZATION_ERROR]';
  }
}

// Audit logging middleware
export function auditMiddleware(req: Request & { apiKey?: { keyPrefix: string; id: string } }, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Initial log entry
  const logEntry: AuditLogEntry = {
    id: requestId,
    timestamp: new Date().toISOString(),
    keyPrefix: req.apiKey?.keyPrefix,
    keyId: req.apiKey?.id,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : undefined,
    requestBody: req.method !== 'GET' ? serializeRequestBody(req.body) : undefined
  };
  
  // Capture response data
  const originalSend = res.send;
  let responseSize = 0;
  
  res.send = function(body: any) {
    if (body && typeof body === 'string') {
      responseSize = Buffer.byteLength(body, 'utf8');
    } else if (body) {
      responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    }
    
    return originalSend.call(this, body);
  };
  
  // Log when response finishes
  res.on('finish', async () => {
    try {
      logEntry.statusCode = res.statusCode;
      logEntry.responseTimeMs = Date.now() - startTime;
      logEntry.responseSize = responseSize;
      
      // Only log API requests or errors
      if (req.path.startsWith('/api/') || req.path.startsWith('/mgmt/') || res.statusCode >= 400) {
        const logs = await loadAuditLogs();
        logs.push(logEntry);
        await saveAuditLogs(logs);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  });
  
  // Log errors
  res.on('error', async (error: Error) => {
    try {
      logEntry.error = error.message;
      logEntry.statusCode = res.statusCode || 500;
      logEntry.responseTimeMs = Date.now() - startTime;
      
      const logs = await loadAuditLogs();
      logs.push(logEntry);
      await saveAuditLogs(logs);
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
  });
  
  next();
}

// Query audit logs
export async function queryAuditLogs(filters: {
  keyPrefix?: string;
  keyId?: string;
  method?: string;
  pathPattern?: string;
  statusCode?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const logs = await loadAuditLogs();
  
  let filteredLogs = logs;
  
  // Apply filters
  if (filters.keyPrefix) {
    filteredLogs = filteredLogs.filter(log => log.keyPrefix === filters.keyPrefix);
  }
  
  if (filters.keyId) {
    filteredLogs = filteredLogs.filter(log => log.keyId === filters.keyId);
  }
  
  if (filters.method) {
    filteredLogs = filteredLogs.filter(log => log.method === filters.method);
  }
  
  if (filters.pathPattern) {
    const pattern = new RegExp(filters.pathPattern, 'i');
    filteredLogs = filteredLogs.filter(log => pattern.test(log.path));
  }
  
  if (filters.statusCode) {
    filteredLogs = filteredLogs.filter(log => log.statusCode === filters.statusCode);
  }
  
  if (filters.fromDate) {
    const fromDate = new Date(filters.fromDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
  }
  
  if (filters.toDate) {
    const toDate = new Date(filters.toDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
  }
  
  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const total = filteredLogs.length;
  const offset = filters.offset || 0;
  const limit = filters.limit || 100;
  
  const entries = filteredLogs.slice(offset, offset + limit);
  
  return { entries, total };
}

// Get audit statistics
export async function getAuditStats(): Promise<{
  totalRequests: number;
  uniqueKeys: number;
  errorRate: number;
  avgResponseTime: number;
  topPaths: Array<{ path: string; count: number }>;
  statusCodes: Record<string, number>;
}> {
  const logs = await loadAuditLogs();
  
  const totalRequests = logs.length;
  const uniqueKeys = new Set(logs.map(log => log.keyPrefix).filter(Boolean)).size;
  const errors = logs.filter(log => log.statusCode && log.statusCode >= 400).length;
  const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
  
  const responseTimeLogs = logs.filter(log => log.responseTimeMs !== undefined);
  const avgResponseTime = responseTimeLogs.length > 0
    ? responseTimeLogs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / responseTimeLogs.length
    : 0;
  
  // Top paths
  const pathCounts: Record<string, number> = {};
  logs.forEach(log => {
    pathCounts[log.path] = (pathCounts[log.path] || 0) + 1;
  });
  
  const topPaths = Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Status codes
  const statusCodes: Record<string, number> = {};
  logs.forEach(log => {
    if (log.statusCode) {
      const code = log.statusCode.toString();
      statusCodes[code] = (statusCodes[code] || 0) + 1;
    }
  });
  
  return {
    totalRequests,
    uniqueKeys,
    errorRate,
    avgResponseTime,
    topPaths,
    statusCodes
  };
}