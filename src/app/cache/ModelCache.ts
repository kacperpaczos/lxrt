/**
 * ModelCache - Manages caching of loaded AI models
 * Follows Single Responsibility Principle
 *
 * This utility provides a centralized way to cache loaded models,
 * ensuring efficient memory usage and fast model retrieval.
 *
 * @author transformers-router
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

export interface ModelCacheEntry {
  model: any;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  expiresAt?: Date;
}

export interface ModelCacheStats {
  totalModels: number;
  totalSize: number;
  hits: number;
  misses: number;
  modelsByType: Record<string, number>;
  averageAccessTime: number;
}

export interface ModelCacheOptions {
  maxSize?: number;
  maxAge?: number;
  cleanupInterval?: number;
}

/**
 * ModelCache - Caches loaded AI models for efficient reuse
 */
export class ModelCache extends EventEmitter {
  private cache = new Map<string, ModelCacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
  };
  private options: ModelCacheOptions;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options: ModelCacheOptions = {}) {
    super();
    this.options = {
      maxSize: options.maxSize || 10,
      maxAge: options.maxAge || 3600000, // 1 hour
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
    };

    this.startCleanupTimer();
  }

  /**
   * Check if a model is cached
   */
  has(type: string, modelName: string): boolean {
    const key = this.getKey(type, modelName);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return false;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return false;
    }

    this.stats.hits++;
    entry.lastAccessed = new Date();
    entry.accessCount++;
    return true;
  }

  /**
   * Get a cached model
   */
  get(type: string, modelName: string): any | undefined {
    const key = this.getKey(type, modelName);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    entry.lastAccessed = new Date();
    entry.accessCount++;
    return entry.model;
  }

  /**
   * Set a model in cache
   */
  set(type: string, modelName: string, model: any, size: number = 0): void {
    const key = this.getKey(type, modelName);
    const now = new Date();

    const entry: ModelCacheEntry = {
      model,
      loadedAt: now,
      lastAccessed: now,
      accessCount: 0,
      size,
      expiresAt: this.options.maxAge
        ? new Date(now.getTime() + this.options.maxAge)
        : undefined,
    };

    this.cache.set(key, entry);
    this.emit('modelCached', { type, modelName, size });

    // Check if we need to evict old models
    this.evictIfNeeded();
  }

  /**
   * Invalidate a cached model
   */
  invalidate(type: string, modelName: string): boolean {
    const key = this.getKey(type, modelName);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.emit('modelInvalidated', { type, modelName });
    }

    return deleted;
  }

  /**
   * Set expiration time for a model
   */
  setExpiration(type: string, modelName: string, maxAge: number): void {
    const key = this.getKey(type, modelName);
    const entry = this.cache.get(key);

    if (entry) {
      entry.expiresAt = new Date(Date.now() + maxAge);
    }
  }

  /**
   * Set maximum cache size
   */
  setMaxSize(maxSize: number): void {
    this.options.maxSize = maxSize;
    this.evictIfNeeded();
  }

  /**
   * Clear all cached models
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0 };
    this.emit('cacheCleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): ModelCacheStats {
    const modelsByType: Record<string, number> = {};
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      const [type] = key.split(':');
      modelsByType[type] = (modelsByType[type] || 0) + 1;
      totalSize += entry.size;
    }

    return {
      totalModels: this.cache.size,
      totalSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      modelsByType,
      averageAccessTime:
        this.stats.totalAccessTime / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Get cache entry details
   */
  getEntry(type: string, modelName: string): ModelCacheEntry | undefined {
    const key = this.getKey(type, modelName);
    return this.cache.get(key);
  }

  /**
   * List all cached models
   */
  listModels(): Array<{
    type: string;
    modelName: string;
    entry: ModelCacheEntry;
  }> {
    const models: Array<{
      type: string;
      modelName: string;
      entry: ModelCacheEntry;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const [type, modelName] = key.split(':');
      models.push({ type, modelName, entry });
    }

    return models;
  }

  /**
   * Dispose of the cache
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Generate cache key
   */
  private getKey(type: string, modelName: string): string {
    return `${type}:${modelName}`;
  }

  /**
   * Evict old models if cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= (this.options.maxSize || 10)) {
      return;
    }

    // Sort by last accessed time (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime()
    );

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(
      0,
      entries.length - (this.options.maxSize || 10)
    );

    for (const [key] of toRemove) {
      this.cache.delete(key);
    }

    this.emit('modelsEvicted', { count: toRemove.length });
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.options.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanupInterval);
    }
  }

  /**
   * Clean up expired models
   */
  private cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.emit('modelsExpired', { count: expiredKeys.length });
    }
  }
}
