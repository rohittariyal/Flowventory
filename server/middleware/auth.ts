import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface ApiKey {
  id: string;
  keyPrefix: string;
  hashedKey: string;
  scopes: string[];
  name: string;
  createdAt: string;
  revokedAt?: string;
  workspaceId?: string;
}

interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
  apiKeyId?: string;
}

const API_KEYS_FILE = path.join(__dirname, '../db/api_keys.json');
const API_HASH_SECRET = process.env.API_HASH_SECRET || 'change_me_in_production';

// Initialize API keys file if it doesn't exist
async function initializeApiKeysFile() {
  try {
    await fs.access(API_KEYS_FILE);
  } catch {
    await fs.writeFile(API_KEYS_FILE, JSON.stringify([], null, 2));
  }
}

// Load API keys from file
async function loadApiKeys(): Promise<ApiKey[]> {
  await initializeApiKeysFile();
  try {
    const data = await fs.readFile(API_KEYS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHmac('sha256', API_HASH_SECRET).update(key).digest('hex');
}

// Generate new API key
export function generateApiKey(): { fullKey: string; keyPrefix: string; hashedKey: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const prefix = `fv_${randomBytes.substring(0, 8)}`;
  const fullKey = `${prefix}_${randomBytes.substring(8)}`;
  const hashedKey = hashApiKey(fullKey);
  
  return { fullKey, keyPrefix: prefix, hashedKey };
}

// Validate API key format
function isValidApiKeyFormat(key: string): boolean {
  return /^fv_[a-f0-9]{8}_[a-f0-9]{48}$/.test(key);
}

// API Key authentication middleware
export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!isValidApiKeyFormat(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }
    
    const hashedKey = hashApiKey(apiKey);
    const apiKeys = await loadApiKeys();
    
    const matchingKey = apiKeys.find(key => 
      key.hashedKey === hashedKey && !key.revokedAt
    );
    
    if (!matchingKey) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }
    
    req.apiKey = matchingKey;
    req.apiKeyId = matchingKey.id;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Scope enforcement middleware
export function requireScopes(...requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasRequiredScopes = requiredScopes.some(scope => 
      req.apiKey!.scopes.includes(scope)
    );
    
    if (!hasRequiredScopes) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredScopes,
        granted: req.apiKey.scopes
      });
    }
    
    next();
  };
}

// Available scopes
export const AVAILABLE_SCOPES = [
  'read:products',
  'write:products',
  'read:inventory', 
  'write:inventory',
  'read:orders',
  'write:orders',
  'read:suppliers',
  'write:suppliers',
  'read:customers',
  'write:customers',
  'read:invoices',
  'write:invoices'
] as const;

export type ApiScope = typeof AVAILABLE_SCOPES[number];

// API Key management functions
export async function createApiKey(data: {
  name: string;
  scopes: string[];
  workspaceId?: string;
}): Promise<{ id: string; fullKey: string; keyPrefix: string }> {
  const { fullKey, keyPrefix, hashedKey } = generateApiKey();
  const apiKeys = await loadApiKeys();
  
  const newKey: ApiKey = {
    id: crypto.randomUUID(),
    keyPrefix,
    hashedKey,
    scopes: data.scopes,
    name: data.name,
    createdAt: new Date().toISOString(),
    workspaceId: data.workspaceId
  };
  
  apiKeys.push(newKey);
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  
  return {
    id: newKey.id,
    fullKey,
    keyPrefix
  };
}

export async function listApiKeys(workspaceId?: string): Promise<Omit<ApiKey, 'hashedKey'>[]> {
  const apiKeys = await loadApiKeys();
  return apiKeys
    .filter(key => !workspaceId || key.workspaceId === workspaceId)
    .map(({ hashedKey, ...key }) => key);
}

export async function revokeApiKey(keyId: string): Promise<boolean> {
  const apiKeys = await loadApiKeys();
  const keyIndex = apiKeys.findIndex(key => key.id === keyId);
  
  if (keyIndex === -1) {
    return false;
  }
  
  apiKeys[keyIndex].revokedAt = new Date().toISOString();
  await fs.writeFile(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  
  return true;
}

export { AuthenticatedRequest };