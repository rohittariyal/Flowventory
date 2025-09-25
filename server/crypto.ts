import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV (recommended for GCM mode)
const TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key

// Get encryption key from environment variable or use default for development
function getEncryptionKey(): Buffer {
  const secretKey = process.env.SHIPPING_SECRET_KEY || process.env.SECRET_KEY || 'dev-key-change-in-production-please!';
  
  if (secretKey === 'dev-key-change-in-production-please!' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using default encryption key in production! Set SHIPPING_SECRET_KEY env var.');
  }
  
  // Create a consistent 32-byte key from the secret
  return scryptSync(secretKey, 'flowventory-shipping', KEY_LENGTH);
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Returns object with IV, auth tag, and encrypted data
 */
export function encryptCredentials(data: Record<string, any>): {
  iv: string;
  authTag: string;
  data: string;
} {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    };
  } catch (error) {
    console.error('Failed to encrypt credentials:', error);
    throw new Error('Credential encryption failed');
  }
}

/**
 * Decrypts credentials encrypted with encryptCredentials
 */
export function decryptCredentials(encryptedData: {
  iv: string;
  authTag: string;
  data: string;
}): Record<string, any> {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt credentials:', error);
    throw new Error('Credential decryption failed - invalid data or key');
  }
}

/**
 * Validates that encrypted credentials have the required structure
 */
export function isValidEncryptedCredentials(data: any): data is {
  iv: string;
  authTag: string;
  data: string;
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.iv === 'string' &&
    typeof data.authTag === 'string' &&
    typeof data.data === 'string' &&
    data.iv.length === IV_LENGTH * 2 && // Hex string is 2x byte length
    data.authTag.length === TAG_LENGTH * 2
  );
}

/**
 * Test function to verify encryption/decryption works
 */
export function testCrypto() {
  const testData = {
    apiKey: 'test-api-key-12345',
    secret: 'super-secret-token',
    accountId: '67890'
  };
  
  try {
    const encrypted = encryptCredentials(testData);
    console.log('✅ Encryption successful:', {
      iv: encrypted.iv.substring(0, 8) + '...',
      authTag: encrypted.authTag.substring(0, 8) + '...',
      dataLength: encrypted.data.length
    });
    
    const decrypted = decryptCredentials(encrypted);
    console.log('✅ Decryption successful:', decrypted);
    
    const matches = JSON.stringify(testData) === JSON.stringify(decrypted);
    console.log('✅ Data integrity check:', matches ? 'PASSED' : 'FAILED');
    
    return matches;
  } catch (error) {
    console.error('❌ Crypto test failed:', error);
    return false;
  }
}