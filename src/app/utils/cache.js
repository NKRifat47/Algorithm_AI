import { redisClient } from "../config/redis.config.js";

const DEFAULT_TTL_SECONDS = 30;

const isRedisReady = () => redisClient && redisClient.isOpen;

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const Cache = {
  /**
   * Cache-aside helper.
   * - If Redis is down, it transparently falls back to computing the value.
   */
  getOrSetJson: async (key, compute, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    if (!key) throw new Error("Cache key is required");
    if (typeof compute !== "function")
      throw new Error("compute must be a function");

    if (!isRedisReady()) {
      return await compute();
    }

    const cached = await redisClient.get(key);
    if (cached != null) {
      const parsed = safeJsonParse(cached);
      if (parsed !== null) return parsed;
    }

    const value = await compute();
    await redisClient.set(key, JSON.stringify(value), {
      EX: Math.max(1, Number(ttlSeconds) || DEFAULT_TTL_SECONDS),
    });
    return value;
  },

  del: async (key) => {
    if (!isRedisReady()) return 0;
    return await redisClient.del(key);
  },

  /**
   * Deletes keys by prefix using SCAN to avoid blocking Redis.
   */
  delByPrefix: async (prefix) => {
    if (!isRedisReady()) return 0;
    if (!prefix) throw new Error("prefix is required");

    let deleted = 0;
    for await (const key of redisClient.scanIterator({
      MATCH: `${prefix}*`,
      COUNT: 250,
    })) {
      deleted += await redisClient.del(key);
    }
    return deleted;
  },
};
