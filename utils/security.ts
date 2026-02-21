
// simple-rate-limiter.ts

export type UserTier = 'Initiate' | 'Scholar' | 'Admin';

export const getUserTier = (): UserTier => {
  const tier = localStorage.getItem('ascent_user_tier');
  if (tier === 'Admin') return 'Admin';
  return (tier === 'Scholar') ? 'Scholar' : 'Initiate';
};

export const getTierLimits = () => {
  const tier = getUserTier();
  switch (tier) {
    case 'Admin':
    case 'Scholar':
      return {
        maxContentLength: 1000000, // Premium capacity
        dailyUploads: 5000,
        dailyChats: 10000,
        label: tier === 'Admin' ? 'Admin' : 'Scholar'
      };
    case 'Initiate':
    default:
      return {
        // INCREASED to 200,000 to support long PDFs (>80k chars) per user request
        maxContentLength: 200000,
        dailyUploads: 50, // Increased to 50
        dailyChats: 1500,
        label: 'Initiate'
      };
  }
};

// --- DATA ENCRYPTION AT REST (Client-Side) ---
// Simulates secure storage. In production, use Web Crypto API or server-side encryption.
const SALT = "ascent_neural_salt_v1_";

export const encryptData = (data: any): string => {
  try {
    const json = JSON.stringify(data);
    // Base64 encoding with salt and reversal for obfuscation
    const b64 = btoa(encodeURIComponent(json));
    return SALT + b64.split('').reverse().join('');
  } catch (e) {
    console.error("Encryption Protocol Failed", e);
    return "";
  }
};

export const decryptData = <T>(cipher: string): T | null => {
  try {
    if (!cipher.startsWith(SALT)) return null;
    const clean = cipher.slice(SALT.length).split('').reverse().join('');
    const json = decodeURIComponent(atob(clean));
    return JSON.parse(json) as T;
  } catch (e) {
    console.error("Decryption Protocol Failed - Data Integrity Compromised", e);
    return null;
  }
};

// --- SESSION SECURITY ---
export const checkSessionLock = (username: string): boolean => {
  const lock = localStorage.getItem(`session_lock_${username}`);
  // Session expires after 24 hours of absolute time
  if (lock && Date.now() - parseInt(lock) < 24 * 60 * 60 * 1000) {
    return true;
  }
  return false;
};

export const lockSession = (username: string) => {
  localStorage.setItem(`session_lock_${username}`, Date.now().toString());
};

export const unlockSession = (username: string) => {
  localStorage.removeItem(`session_lock_${username}`);
};

// IDLE TIMEOUT
let idleTimer: any;
export const initIdleMonitor = (onTimeout: () => void) => {
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes

  const resetTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      console.warn("Session terminated due to inactivity.");
      onTimeout();
    }, TIMEOUT_MS);
  };

  window.onmousemove = resetTimer;
  window.onkeypress = resetTimer;
  window.onclick = resetTimer;
  window.onscroll = resetTimer;

  resetTimer();
};

// --- RATE LIMITING ---
export class RateLimiter {
  private timestamps: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.limit) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}

export class DailyRateLimiter {
  private key: string;

  constructor(key: string) {
    this.key = `ascent_limit_${key}`;
  }

  private getRecord(): { count: number; date: string } {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Storage access error", e);
    }
    return { count: 0, date: new Date().toDateString() };
  }

  private saveRecord(record: { count: number; date: string }) {
    localStorage.setItem(this.key, JSON.stringify(record));
  }

  check(dynamicLimit: number): boolean {
    const record = this.getRecord();
    const today = new Date().toDateString();

    if (record.date !== today) {
      this.saveRecord({ count: 1, date: today });
      return true;
    }

    if (record.count >= dynamicLimit) {
      return false;
    }

    this.saveRecord({ count: record.count + 1, date: today });
    return true;
  }

  getRemaining(dynamicLimit: number): number {
    const record = this.getRecord();
    const today = new Date().toDateString();

    if (record.date !== today) {
      return dynamicLimit;
    }
    return Math.max(0, dynamicLimit - record.count);
  }

  getCurrentCount(): number {
    const record = this.getRecord();
    const today = new Date().toDateString();
    if (record.date !== today) return 0;
    return record.count;
  }
}

// Relaxed limits to allow burst generation
export const generationRateLimiter = new RateLimiter(150, 60000);
export const chatSpamLimiter = new RateLimiter(50, 60000);

export const dailyChatLimiter = new DailyRateLimiter('chat_daily');
export const dailyUploadLimiter = new DailyRateLimiter('upload_daily');

export const validateInput = (input: string, context: 'content' | 'chat'): { valid: boolean; error?: string } => {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: "Input cannot be empty." };
  }

  const limits = getTierLimits();
  const MAX_CONTENT_LENGTH = limits.maxContentLength;
  const MAX_CHAT_LENGTH = 2000;

  if (context === 'content' && input.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content exceeds ${limits.label} Tier limit (${Math.round(input.length / 1000)}k/${Math.round(MAX_CONTENT_LENGTH / 1000)}k chars). Upgrade for more capacity.`
    };
  }

  if (context === 'chat' && input.length > MAX_CHAT_LENGTH) {
    return { valid: false, error: `Message too long (${MAX_CHAT_LENGTH} chars max).` };
  }

  // Enhanced Sanitization
  const suspiciousPatterns = /<script\b[^>]*>([\s\S]*?)<\/script>|javascript:|data:text\/html|vbscript:|onload=|onerror=/gim;
  if (suspiciousPatterns.test(input)) {
    return { valid: false, error: "Security Alert: Malicious payload detected." };
  }

  return { valid: true };
};
