// In-memory cache implementation (replaces Redis)
// This provides the same API as the Redis cache but uses in-memory storage

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds: number = 30): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  exists(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Create a singleton instance
const memoryCache = new InMemoryCache();

// Export cache service with the same API as before
export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    return memoryCache.get<T>(key);
  },

  async set(key: string, value: any, ttlSeconds: number = 30): Promise<void> {
    memoryCache.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    memoryCache.del(key);
  },

  async exists(key: string): Promise<boolean> {
    return memoryCache.exists(key);
  }
};

// Export a mock redisClient for compatibility (used in server.ts)
export const redisClient = {
  async ping(): Promise<string> {
    return 'PONG';
  },
  async quit(): Promise<void> {
    memoryCache.destroy();
  }
};
