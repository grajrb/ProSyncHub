# MongoDB and Redis Testing Guide

This guide provides instructions for testing the MongoDB and Redis integration in the ProSyncHub project.

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Docker (optional, for local MongoDB and Redis instances)

## Setting Up Test Environment

### Option 1: Using Docker (Recommended)

1. Start MongoDB and Redis containers:

```bash
docker-compose up -d mongodb redis
```

2. Set up environment variables for testing:

```bash
copy .env.example .env.test
```

Edit `.env.test` to point to your Docker instances:

```
MONGODB_URI=mongodb://localhost:27017/prosync-hub-test
REDIS_URL=redis://localhost:6379
```

### Option 2: Using In-Memory Instances

For CI/CD pipelines or quick testing, the tests can use in-memory versions of MongoDB and Redis:

```bash
npm install --save-dev mongodb-memory-server redis-memory-server
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# MongoDB API endpoints tests
npm test -- server/tests/mongoRoutes.test.ts

# Redis pub/sub with WebSocket tests
npm test -- server/tests/redisPubSub.test.ts

# Redis session management tests
npm test -- server/tests/redisSession.test.ts

# Asset cache service tests
npm test -- server/tests/assetCacheService.test.ts
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Test Descriptions

### MongoDB Tests (`mongoRoutes.test.ts`)

Tests for MongoDB API endpoints including:

1. **Sensor Data Endpoints**
   - Creating new sensor readings
   - Filtering sensor data
   - Getting latest readings
   - Aggregating sensor data

2. **Event Log Endpoints**
   - Creating event logs
   - Filtering event logs
   - Acknowledging events

3. **Chat Message Endpoints**
   - Sending messages
   - Retrieving messages by room
   - Marking messages as read

4. **Checklist Endpoints**
   - Creating checklists
   - Filtering checklists
   - Adding items to checklists
   - Completing checklists

### Redis Pub/Sub Tests (`redisPubSub.test.ts`)

Tests for Redis pub/sub integration with WebSockets:

1. **Connection Tests**
   - WebSocket server initialization
   - Client connection handling

2. **Real-time Update Tests**
   - Publishing and receiving messages on channels
   - Sensor data updates
   - Asset updates

3. **User-specific Channel Tests**
   - Direct messaging
   - User authentication
   - Channel subscription

### Redis Session Tests (`redisSession.test.ts`)

Tests for Redis session management:

1. **Session Creation**
   - Creating sessions on login
   - Storing session data in Redis

2. **Session Retrieval**
   - Retrieving session data
   - Verifying session integrity

3. **JWT Token Management**
   - Blacklisting tokens on logout
   - Checking token validity

4. **Session Expiry**
   - Handling expired sessions
   - Cleaning up expired data

### Asset Cache Tests (`assetCacheService.test.ts`)

Tests for the asset cache service:

1. **Cache Operations**
   - Storing data in the cache
   - Retrieving cached data
   - Cache expiry

2. **Cache Invalidation**
   - Invalidating specific cache entries
   - Clearing all caches for an asset
   - Clearing all asset caches

## Debugging Tests

To run tests in debug mode:

```bash
# Using Node.js debugger
node --inspect-brk ./node_modules/.bin/jest --runInBand server/tests/mongoRoutes.test.ts

# Using VS Code
# Add the following configuration to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${relativeFile}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Test Issues and Solutions

### Connection Errors

**Issue**: Tests fail with connection errors to MongoDB or Redis.

**Solution**: 
- Verify that MongoDB and Redis are running
- Check connection strings in `.env.test`
- Ensure ports are not blocked by firewall

### Timing Issues

**Issue**: Tests involving WebSockets or pub/sub sometimes fail due to timing.

**Solution**:
- Increase timeout values in test configuration
- Use proper async/await patterns in tests
- Add delay utilities for WebSocket tests

### Data Persistence

**Issue**: Tests interfere with each other due to shared data.

**Solution**:
- Ensure proper cleanup in `afterEach` and `afterAll` blocks
- Use unique identifiers for test data
- Use separate databases or collections for different test suites
