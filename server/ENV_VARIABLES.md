# Environment Variables for ProSyncHub

This document describes all environment variables required by the ProSyncHub application.

## MongoDB Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| MONGODB_URI | MongoDB connection URI | mongodb://localhost:27017/prosync-hub | Yes |
| MONGODB_USER | MongoDB username | - | No |
| MONGODB_PASSWORD | MongoDB password | - | No |
| MONGODB_DATABASE | MongoDB database name | prosync-hub | No |

## Redis Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| REDIS_URL | Redis connection URI | redis://localhost:6379 | Yes |
| REDIS_PASSWORD | Redis password | - | No |
| REDIS_TLS | Enable TLS for Redis connection | false | No |

## Application Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| NODE_ENV | Node.js environment | development | Yes |
| PORT | HTTP server port | 5000 | No |
| LOG_LEVEL | Logging level (debug, info, warn, error) | info | No |
| API_TIMEOUT | API request timeout in milliseconds | 30000 | No |

## Authentication Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| JWT_SECRET | Secret key for JWT signing | - | Yes |
| JWT_EXPIRATION | JWT token expiration time | 24h | No |
| SESSION_SECRET | Secret for Express session | - | Yes |
| SESSION_EXPIRY | Session expiration time in seconds | 86400 | No |

## Caching Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| ASSET_CACHE_TTL | Asset cache TTL in seconds | 3600 | No |
| SENSOR_CACHE_TTL | Sensor data cache TTL in seconds | 300 | No |
| USER_CACHE_TTL | User data cache TTL in seconds | 1800 | No |

## Storage Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| STORAGE_TYPE | Storage type (local, s3) | local | No |
| STORAGE_PATH | Local storage path | ./uploads | No |
| S3_BUCKET | AWS S3 bucket name | - | No* |
| S3_REGION | AWS S3 region | - | No* |
| S3_ACCESS_KEY | AWS S3 access key | - | No* |
| S3_SECRET_KEY | AWS S3 secret key | - | No* |

*Required if STORAGE_TYPE is set to 's3'

## Example .env File

```
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/prosync-hub

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# Authentication Configuration
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Caching Configuration
ASSET_CACHE_TTL=3600
SENSOR_CACHE_TTL=300
USER_CACHE_TTL=1800

# Storage Configuration
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

## Setting Up Environment Variables

### Development Environment

Create a `.env` file in the root directory of the project and add the necessary variables.

### Production Environment

In production environments, it's recommended to set environment variables through the platform's configuration (e.g., Docker, Kubernetes, Heroku, etc.).

#### Docker

When using Docker, you can set environment variables in the `docker-compose.yml` file:

```yaml
services:
  app:
    image: prosync-hub
    environment:
      - MONGODB_URI=mongodb://mongo:27017/prosync-hub
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - SESSION_SECRET=your-session-secret
```

#### Kubernetes

For Kubernetes deployments, environment variables can be set in the deployment YAML file or through ConfigMaps and Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prosync-hub-config
data:
  NODE_ENV: "production"
  PORT: "5000"
  LOG_LEVEL: "info"
  MONGODB_URI: "mongodb://mongo-service:27017/prosync-hub"
  REDIS_URL: "redis://redis-service:6379"
```

And for sensitive information:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: prosync-hub-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-value>
  SESSION_SECRET: <base64-encoded-value>
```
