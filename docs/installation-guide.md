# ProSyncHub Installation Guide

This guide provides step-by-step instructions for installing and setting up the ProSyncHub platform for both development and production environments.

## Prerequisites

Before installing ProSyncHub, ensure you have the following prerequisites installed:

### For Development Environment

- **Node.js** (v16 or higher)
- **npm** (v7 or higher) or **yarn** (v1.22 or higher)
- **PostgreSQL** (v13 or higher)
- **MongoDB** (v5 or higher)
- **Redis** (v6 or higher)
- **Git**

### For Production Environment

All of the above, plus:
- **Docker** (v20 or higher) and **Docker Compose** (v2 or higher)
- **Nginx** (for reverse proxy)
- **SSL certificate** (for secure HTTPS connections)

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ProSyncHub.git
cd ProSyncHub
```

### 2. Install Frontend Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
# or
yarn install
cd ..
```

### 4. Set Up Databases

#### PostgreSQL

1. Create a new PostgreSQL database:

```sql
CREATE DATABASE prosync;
```

2. Create a database user (optional):

```sql
CREATE USER prosyncuser WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE prosync TO prosyncuser;
```

#### MongoDB

1. Start MongoDB server:

```bash
mongod
```

2. The application will automatically create the MongoDB collections when it runs.

#### Redis

1. Start Redis server:

```bash
redis-server
```

### 5. Configure Environment Variables

1. Create environment files:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

2. Edit the `.env` and `server/.env` files with your configuration:

#### Main .env file:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
```

#### Server .env file:

Update the database connection details and other settings:

```
# Server Configuration
PORT=5000
NODE_ENV=development
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000

# JWT Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=prosync
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_SSL=false

# MongoDB Database
MONGO_URI=mongodb://localhost:27017/prosync
MONGO_USER=
MONGO_PASSWORD=
MONGO_AUTH_SOURCE=admin

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

### 6. Start the Development Servers

1. Start the backend server:

```bash
cd server
npm run dev
# or
yarn dev
```

2. In a new terminal, start the frontend server:

```bash
# From the project root
npm run dev
# or
yarn dev
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API documentation: http://localhost:5000/api-docs

## Production Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ProSyncHub.git
cd ProSyncHub
```

### 2. Configure Environment Variables

Create and edit production environment files:

```bash
cp .env.example .env.production
cp server/.env.example server/.env.production
```

Update the environment variables with production settings, including:
- Database connection strings for production databases
- Production API URLs
- Proper JWT secrets
- SSL settings

### 3. Build the Frontend

```bash
npm install
npm run build
# or
yarn install
yarn build
```

### 4. Set Up with Docker Compose

1. Create a production Docker Compose file:

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - backend

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    env_file:
      - server/.env.production
    depends_on:
      - postgres
      - mongodb
      - redis

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: prosync
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-production-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  mongodb:
    image: mongo:5
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:6
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
```

2. Create Dockerfiles:

Frontend Dockerfile (Dockerfile.frontend):
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Backend Dockerfile (server/Dockerfile):
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "src/index.js"]
```

3. Start the services:

```bash
docker-compose -f docker-compose.production.yml up -d
```

### 5. Set Up Nginx as a Reverse Proxy (Optional)

1. Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

2. Configure Nginx:

```
# /etc/nginx/sites-available/prosync
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/prosync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Set Up SSL with Let's Encrypt (Optional)

1. Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

2. Obtain and install SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

3. Certbot will automatically update your Nginx configuration to use HTTPS.

## Troubleshooting

### Common Installation Issues

1. **Database Connection Errors**:
   - Verify that PostgreSQL, MongoDB, and Redis are running
   - Check that the connection details in the .env files are correct
   - Ensure the database user has the proper permissions

2. **Port Conflicts**:
   - Check if ports 3000, 5000, 5432, 27017, or 6379 are already in use
   - Update the port numbers in the .env files if needed

3. **Node.js Errors**:
   - Ensure you're using a compatible Node.js version
   - Try clearing the npm cache: `npm cache clean --force`
   - Delete node_modules and package-lock.json and reinstall

4. **Docker Issues**:
   - Check Docker logs: `docker-compose logs`
   - Ensure Docker has enough resources allocated
   - Try rebuilding the images: `docker-compose build --no-cache`

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting section in the User Manual](./user-manual.md#troubleshooting)
2. Review the [Developer Guide](./developer-guide.md) for development-specific help
3. Search for similar issues in the project's issue tracker
4. Reach out to the community or support team for assistance
