# MongoDB and Redis Integration

ProSyncHub uses MongoDB for time-series data and Redis for caching and real-time messaging. This document provides an overview of their implementation and usage in the application.

## MongoDB Integration

MongoDB is used to store:
- Sensor data readings (time-series data)
- Event logs
- Chat messages
- Checklists
- User accounts and profiles

### MongoDB Models

1. **AssetSensorData**: Stores sensor readings with efficient time-series capabilities
2. **EventLog**: Tracks system events, alerts, and user actions
3. **ChatMessage**: Stores messages for real-time collaboration
4. **Checklist**: Manages maintenance checklists and procedures
5. **User**: Manages user accounts, authentication, and profiles

### MongoDB API Endpoints

The MongoDB API endpoints are available under `/api/mongo` and include:

- **Sensor Data**: `/api/mongo/sensor-data`
  - GET: Retrieve sensor data with filtering
  - POST: Add new sensor reading
  - GET `/api/mongo/sensor-data/latest/:assetId`: Get latest readings for an asset
  - GET `/api/mongo/sensor-data/aggregated`: Get aggregated data for analytics

- **Event Logs**: `/api/mongo/event-logs`
  - GET: Retrieve event logs with filtering
  - POST: Create new event log
  - POST `/api/mongo/event-logs/:id/acknowledge`: Acknowledge an event

- **Chat Messages**: `/api/mongo/chat/messages`
  - GET `/api/mongo/chat/messages/:roomId`: Get messages for a chat room
  - POST: Send a new message
  - POST `/api/mongo/chat/messages/:roomId/read`: Mark messages as read

- **Checklists**: `/api/mongo/checklists`
  - GET: Retrieve checklists with filtering
  - POST: Create new checklist
  - PUT `/api/mongo/checklists/:id`: Update a checklist
  - POST `/api/mongo/checklists/:id/items`: Add a checklist item
  - POST `/api/mongo/checklists/:id/complete`: Mark a checklist as completed

## Redis Integration

Redis is used for:
1. **Caching**: Improving application performance by caching frequently accessed data
2. **Pub/Sub**: Enabling real-time updates across distributed services
3. **Session Management**: Handling user sessions and JWT token management
4. **Rate Limiting**: Protecting the API from abuse

### Redis Client

The Redis client is implemented in `redisClient.ts` and provides a connection to the Redis server. The client handles:
- Connection management (connect/disconnect)
- Error handling
- Graceful shutdown

### Redis Services

Redis functionality is exposed through various methods in `redis.ts`:

#### Caching Operations

- `setCache(key, value, expiryInSeconds)`: Store data in the cache
- `getCache(key)`: Retrieve data from the cache
- `deleteCache(key)`: Remove data from the cache
- `clearCache(pattern)`: Clear cache based on a pattern

#### Pub/Sub Operations

- `publishMessage(channel, message)`: Publish a message to a channel
- `subscribeToChannel(channel, callback)`: Subscribe to a channel

#### Session Management

- `storeUserSession(userId, sessionData, expiryInSeconds)`: Store user session data
- `getUserSession(userId)`: Retrieve user session data
- `deleteUserSession(userId)`: Delete user session
- `blacklistToken(token, expiryInSeconds)`: Add a token to the blacklist
- `isTokenBlacklisted(token)`: Check if a token is blacklisted

### WebSocket Integration with Redis Pub/Sub

The WebSocket service integrates with Redis pub/sub to enable real-time communication:

#### WebSocket Channels

- `events:global`: Global application events
- `events:assets`: Asset-related events
- `events:sensors`: Sensor data and alerts
- `events:chat`: Chat-related events
- `events:user:<userId>`: User-specific events

#### Message Flow

1. A service publishes a message to a Redis channel
2. Redis distributes the message to all subscribers
3. The WebSocket service receives the message and broadcasts it to connected clients
4. Client applications receive the message and update the UI accordingly

### Cache Invalidation

The asset cache service implements a robust cache invalidation strategy:

1. **Time-based Invalidation**: All cached data has an expiry time
2. **Manual Invalidation**: Cache can be invalidated when data is updated
3. **Targeted Invalidation**: Only relevant caches are invalidated when data changes
4. **Bulk Invalidation**: Methods to clear all caches for an asset or all assets

### Authentication and Session Management

The system uses JWT tokens for authentication with Redis for token blacklisting and session management:

#### Authentication Flow

1. User logs in via `/api/auth/login` endpoint
2. Server validates credentials and generates JWT token
3. Session data is stored in Redis with expiry matching JWT
4. Token is returned to client

#### Token Validation Flow

1. Client sends request with JWT token
2. Server checks if token is blacklisted in Redis
3. If not blacklisted, token is verified and request proceeds
4. If blacklisted, request is rejected

#### Logout Flow

1. User logs out via `/api/auth/logout` endpoint
2. Token is added to blacklist in Redis until its expiry
3. User session is deleted from Redis

## Docker and Kubernetes Configuration

The project includes Docker and Kubernetes configurations for MongoDB and Redis:

### Docker Compose

The `docker-compose.yml` file includes:
- MongoDB container with volume for persistent data
- Redis container with volume for persistent data
- Configuration for passwords and networking

### Kubernetes

Kubernetes resources include:
- Deployments for MongoDB and Redis
- Services for network access
- Persistent Volume Claims for data storage
- ConfigMaps for configuration
- Secrets for sensitive data

## Environment Variables

### MongoDB Configuration

```
# MongoDB Configuration
MONGODB_URI=mongodb://username:password@hostname:port/database
MONGODB_USERNAME=username
MONGODB_PASSWORD=password
MONGODB_HOST=hostname
MONGODB_PORT=27017
MONGODB_DATABASE=prosync-hub
MONGODB_AUTH_SOURCE=admin
MONGODB_REPLICA_SET=rs0
MONGODB_MAX_POOL_SIZE=10
MONGODB_CONNECTION_TIMEOUT=30000
```

### Redis Configuration

```
# Redis Configuration
REDIS_URL=redis://username:password@hostname:port
REDIS_USERNAME=username
REDIS_PASSWORD=password
REDIS_HOST=hostname
REDIS_PORT=6379
REDIS_DB=0
REDIS_TLS=false
REDIS_CACHE_TTL=3600
REDIS_SESSION_TTL=86400
```

### Security Configuration

```
# Security Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=1h
SESSION_SECRET=your-session-secret
```

## Running Locally

To run the application with MongoDB and Redis locally:

```bash
# Start MongoDB and Redis with Docker
docker-compose up -d mongodb redis

# Start the application
npm run dev
```

## Testing

Test the MongoDB and Redis integration with:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- redisPubSub.test.ts
npm test -- redisSession.test.ts
npm test -- assetCacheService.test.ts
npm test -- mongoRoutes.test.ts
```

The tests verify:
1. MongoDB CRUD operations and API endpoints
2. Redis caching functionality and invalidation
3. Redis pub/sub integration with WebSockets
4. Session management and JWT token handling

## Best Practices

### MongoDB

1. Use appropriate indexes for frequently queried fields
2. Implement data lifecycle management for time-series data
3. Use connection pooling and proper error handling
4. Set appropriate read/write concerns based on data importance

### Redis

1. Configure appropriate key expiry times to manage memory usage
2. Use targeted cache invalidation to avoid stale data
3. Implement error handling and reconnection logic
4. Set up Redis persistence for critical data
5. Use Redis Cluster or Sentinel for high availability in production

### Security

1. Store sensitive connection information in environment variables or secrets
2. Use TLS for all connections in production
3. Implement proper authentication and authorization
4. Regularly rotate credentials and secrets
5. Set up proper network security in Kubernetes or Docker environments
