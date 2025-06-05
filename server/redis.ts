import { redisClient } from './redisClient'; // Adjust the import based on your project structure

export const publishMessage = async (channel: string, message: any): Promise<void> => {
  const stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
  await redisClient.publish(channel, stringMessage);
};

export const subscribeToChannel = async (channel: string, callback: (message: string) => void): Promise<void> => {
  const subscriber = redisClient.duplicate();
  await subscriber.connect();
  await subscriber.subscribe(channel, (message: string) => {
    try {
      const parsedMessage = JSON.parse(message);
      callback(parsedMessage);
    } catch {
      callback(message);
    }
  });
};

// Set a value in Redis with optional expiration (in seconds)
export const setCache = async (key: string, value: any, expirationSeconds?: number): Promise<void> => {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (expirationSeconds) {
    await redisClient.set(key, stringValue, { EX: expirationSeconds });
  } else {
    await redisClient.set(key, stringValue);
  }
};

// Get a value from Redis and parse as JSON if possible
export const getCache = async <T = any>(key: string): Promise<T | null> => {
  const value = await redisClient.get(key);
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value as unknown as T;
  }
};

// Check if a JWT token is blacklisted (e.g., after logout)
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  // Convention: store blacklisted tokens as keys with a short expiration
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// Delete a key from Redis
export const deleteCache = async (key: string): Promise<boolean> => {
  const result = await redisClient.del(key);
  return result > 0;
};

// Clear all keys matching a prefix (WARNING: uses KEYS, not for production scale)
export const clearCache = async (prefix: string): Promise<number> => {
  const keys = await redisClient.keys(`${prefix}*`);
  if (keys.length === 0) return 0;
  return await redisClient.del(keys);
};

// Connect to Redis
export const connectToRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};