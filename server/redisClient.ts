import { createClient } from 'redis';

// Read environment variables with defaults
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_USERNAME = process.env.REDIS_USERNAME || '';

// Create Redis client
export const redisClient = createClient({
  url: REDIS_URL,
  username: REDIS_USERNAME || undefined,
  password: REDIS_PASSWORD || undefined,
});

// Set up error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Log successful connection
redisClient.on('connect', () => {
  console.log('Redis client connected successfully');
});

// Log disconnection
redisClient.on('disconnect', () => {
  console.log('Redis client disconnected');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  console.log('Redis client disconnected through app termination');
  process.exit(0);
});

export default redisClient;
