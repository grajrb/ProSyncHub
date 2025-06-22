const { createClient } = require('redis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'redis-db' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'redis-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'redis.log' })
  ]
});

let redisClient;

// Connect to Redis
async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    await redisClient.connect();
    
    logger.info('Redis connection established successfully');
    return redisClient;
  } catch (error) {
    logger.error('Unable to connect to Redis:', error);
    throw error;
  }
}

// Get Redis client
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

module.exports = {
  connectRedis,
  getRedisClient,
  redisClient
};

module.exports = {
  connectRedis,
  getRedisClient
};
