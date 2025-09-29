import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RateLimitEntry {
  keyPrefix: string;
  tokens: number;
  lastRefill: number;
  requestCount: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per minute
  windowMs: number; // window in milliseconds
}

const RATE_LIMITS_FILE = path.join(__dirname, '../db/ratelimits.json');
const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 60, // 60 requests
  refillRate: 60, // per minute
  windowMs: 60 * 1000 // 1 minute window
};

// Initialize rate limits file
async function initializeRateLimitsFile() {
  try {
    await fs.access(RATE_LIMITS_FILE);
  } catch {
    await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify([], null, 2));
  }
}

// Load rate limit data
async function loadRateLimits(): Promise<RateLimitEntry[]> {
  await initializeRateLimitsFile();
  try {
    const data = await fs.readFile(RATE_LIMITS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save rate limit data
async function saveRateLimits(limits: RateLimitEntry[]) {
  await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(limits, null, 2));
}

// Token bucket algorithm implementation
function updateTokenBucket(entry: RateLimitEntry, config: RateLimitConfig): RateLimitEntry {
  const now = Date.now();
  const timePassed = now - entry.lastRefill;
  
  if (timePassed >= config.windowMs) {
    // Refill bucket completely if a full window has passed
    entry.tokens = config.maxTokens;
    entry.lastRefill = now;
  } else {
    // Partial refill based on time passed
    const tokensToAdd = Math.floor((timePassed / config.windowMs) * config.refillRate);
    entry.tokens = Math.min(config.maxTokens, entry.tokens + tokensToAdd);
    
    if (tokensToAdd > 0) {
      entry.lastRefill = now;
    }
  }
  
  return entry;
}

// Rate limiting middleware
export function rateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const rateLimitConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: Request & { apiKey?: { keyPrefix: string } }, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if no API key (for non-API routes)
      if (!req.apiKey?.keyPrefix) {
        return next();
      }
      
      const keyPrefix = req.apiKey.keyPrefix;
      const rateLimits = await loadRateLimits();
      
      // Find or create rate limit entry for this key
      let entry = rateLimits.find(limit => limit.keyPrefix === keyPrefix);
      
      if (!entry) {
        entry = {
          keyPrefix,
          tokens: rateLimitConfig.maxTokens,
          lastRefill: Date.now(),
          requestCount: 0
        };
        rateLimits.push(entry);
      }
      
      // Update token bucket
      entry = updateTokenBucket(entry, rateLimitConfig);
      entry.requestCount++;
      
      // Check if request can be allowed
      if (entry.tokens >= 1) {
        entry.tokens--;
        await saveRateLimits(rateLimits);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': rateLimitConfig.maxTokens.toString(),
          'X-RateLimit-Remaining': Math.floor(entry.tokens).toString(),
          'X-RateLimit-Reset': new Date(entry.lastRefill + rateLimitConfig.windowMs).toISOString()
        });
        
        next();
      } else {
        // Rate limit exceeded
        const retryAfterSec = Math.ceil((rateLimitConfig.windowMs - (Date.now() - entry.lastRefill)) / 1000);
        
        res.set({
          'X-RateLimit-Limit': rateLimitConfig.maxTokens.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.lastRefill + rateLimitConfig.windowMs).toISOString(),
          'Retry-After': retryAfterSec.toString()
        });
        
        res.status(429).json({
          error: 'rate_limited',
          message: 'Too many requests',
          retryAfterSec
        });
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests on rate limit errors, just log and continue
      next();
    }
  };
}

// Get rate limit stats for monitoring
export async function getRateLimitStats(keyPrefix?: string): Promise<RateLimitEntry[]> {
  const rateLimits = await loadRateLimits();
  
  if (keyPrefix) {
    return rateLimits.filter(limit => limit.keyPrefix === keyPrefix);
  }
  
  return rateLimits;
}

// Clean up old rate limit entries (for maintenance)
export async function cleanupRateLimits(olderThanMs: number = 24 * 60 * 60 * 1000) {
  const rateLimits = await loadRateLimits();
  const cutoff = Date.now() - olderThanMs;
  
  const activeLimits = rateLimits.filter(limit => limit.lastRefill > cutoff);
  await saveRateLimits(activeLimits);
  
  return rateLimits.length - activeLimits.length; // Number of cleaned entries
}