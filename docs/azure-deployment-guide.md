# ProSyncHub Azure Deployment Guide

This guide provides step-by-step instructions for deploying the ProSyncHub industrial asset management platform to Microsoft Azure.

## Prerequisites

Before starting the deployment process, ensure you have the following:

1. **Azure Account**: An active Azure subscription with sufficient permissions
2. **Azure CLI**: Installed and configured locally
3. **Docker**: Installed for building container images
4. **Node.js**: Version 18 or higher
5. **Git**: For cloning the repository

## Architecture Overview

The ProSyncHub deployment on Azure includes the following services:

- **Azure App Service**: For hosting the Next.js frontend
- **Azure Container Apps**: For hosting the Express.js backend API
- **Azure Database for PostgreSQL**: For relational data storage
- **Azure Cosmos DB with MongoDB API**: For document-based data storage
- **Azure Cache for Redis**: For caching and real-time messaging
- **Azure Monitor**: For application monitoring and logging
- **Azure Storage Account**: For file storage and static assets
- **Azure Key Vault**: For secure management of secrets and credentials

## Step 1: Set Up Azure Resources

### Create Resource Group

```bash
# Create a resource group
az group create --name prosync-hub-rg --location eastus
```

### Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-postgres \
  --location eastus \
  --admin-user prosyncadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name GP_Gen5_2

# Configure firewall to allow Azure services
az postgres server firewall-rule create \
  --resource-group prosync-hub-rg \
  --server prosync-hub-postgres \
  --name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create database
az postgres db create \
  --resource-group prosync-hub-rg \
  --server-name prosync-hub-postgres \
  --name prosync
```

### Create Azure Cosmos DB with MongoDB API

```bash
# Create Cosmos DB account with MongoDB API
az cosmosdb create \
  --name prosync-hub-cosmos \
  --resource-group prosync-hub-rg \
  --kind MongoDB \
  --capabilities EnableMongo \
  --default-consistency-level Session \
  --locations regionName=eastus

# Create database
az cosmosdb mongodb database create \
  --account-name prosync-hub-cosmos \
  --resource-group prosync-hub-rg \
  --name prosync
```

### Create Azure Cache for Redis

```bash
# Create Redis cache
az redis create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-redis \
  --location eastus \
  --sku Standard \
  --vm-size C1
```

### Create Azure Storage Account

```bash
# Create storage account
az storage account create \
  --name prosynchubstorage \
  --resource-group prosync-hub-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create container
az storage container create \
  --name uploads \
  --account-name prosynchubstorage \
  --auth-mode login
```

### Create Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-kv \
  --location eastus

# Add secrets
az keyvault secret set --vault-name prosync-hub-kv --name DB-PASSWORD --value "YourSecurePassword123!"
az keyvault secret set --vault-name prosync-hub-kv --name JWT-SECRET --value "YourJwtSecretKey123!"
az keyvault secret set --vault-name prosync-hub-kv --name REDIS-PASSWORD --value "YourRedisPassword123!"
```

### Create Application Insights

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --app prosync-hub-insights \
  --location eastus \
  --resource-group prosync-hub-rg \
  --application-type web
```

## Step 2: Build and Configure Application

### Clone the Repository

```bash
git clone https://github.com/yourusername/ProSyncHub.git
cd ProSyncHub
```

### Configure Environment Variables

1. Create production environment files:

```bash
cp .env.example .env.production
cp server/.env.example server/.env.production
```

2. Update the frontend environment file (`.env.production`):

```
NEXT_PUBLIC_API_URL=https://prosync-hub-api.azurewebsites.net/api
NEXT_PUBLIC_SOCKET_URL=https://prosync-hub-api.azurewebsites.net
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
```

3. Update the backend environment file (`server/.env.production`):

```
# Server Configuration
PORT=8080
NODE_ENV=production
API_VERSION=v1
CORS_ORIGIN=https://prosync-hub.azurewebsites.net
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# JWT Authentication
JWT_SECRET=YourJwtSecretKey123!
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=YourJwtRefreshSecretKey123!
JWT_REFRESH_EXPIRES_IN=7d

# PostgreSQL Database
POSTGRES_HOST=prosync-hub-postgres.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DB=prosync
POSTGRES_USER=prosyncadmin@prosync-hub-postgres
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_SSL=true

# MongoDB Database
MONGO_URI=your-cosmos-db-connection-string
MONGO_USER=
MONGO_PASSWORD=
MONGO_AUTH_SOURCE=admin

# Redis Configuration
REDIS_HOST=prosync-hub-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=YourRedisPassword123!
REDIS_TLS=true

# Logging and Monitoring
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string

# File Storage
STORAGE_TYPE=azure
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER=uploads
```

### Build Applications

1. Build the frontend:

```bash
npm install
npm run build
```

2. Build the backend:

```bash
cd server
npm install
cd ..
```

## Step 3: Deploy the Backend to Azure Container Apps

### Create Container Registry

```bash
# Create Azure Container Registry
az acr create --resource-group prosync-hub-rg --name prosynchubacr --sku Standard

# Log in to ACR
az acr login --name prosynchubacr
```

### Build and Push Backend Docker Image

1. Create a Dockerfile in the server directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "src/index.js"]
```

2. Build and push the image:

```bash
# Build the backend image
docker build -t prosynchubacr.azurecr.io/prosync-backend:latest ./server

# Push to ACR
docker push prosynchubacr.azurecr.io/prosync-backend:latest
```

### Deploy to Container Apps

```bash
# Create Container Apps Environment
az containerapp env create \
  --name prosync-hub-env \
  --resource-group prosync-hub-rg \
  --location eastus

# Create Container App for backend
az containerapp create \
  --name prosync-hub-api \
  --resource-group prosync-hub-rg \
  --environment prosync-hub-env \
  --image prosynchubacr.azurecr.io/prosync-backend:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server prosynchubacr.azurecr.io \
  --query properties.configuration.ingress.fqdn
```

## Step 4: Deploy the Frontend to Azure App Service

### Create App Service Plan

```bash
# Create App Service Plan
az appservice plan create \
  --name prosync-hub-plan \
  --resource-group prosync-hub-rg \
  --sku P1V2 \
  --is-linux
```

### Build and Deploy Frontend

1. Create a web.config file in the project root:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="node_modules/next/dist/server/next-server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="Node-Routes" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="node_modules/next/dist/server/next-server.js" />
        </rule>
      </rules>
    </rewrite>
    <iisnode 
      nodeProcessCommandLine="node.exe"
      watchedFiles="web.config;*.js"
      loggingEnabled="true"
      logDirectory="iisnode"
      debuggingEnabled="true"
    />
  </system.webServer>
</configuration>
```

2. Create a production Dockerfile for the frontend:

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

3. Build and push frontend Docker image:

```bash
# Build the frontend image
docker build -t prosynchubacr.azurecr.io/prosync-frontend:latest .

# Push to ACR
docker push prosynchubacr.azurecr.io/prosync-frontend:latest
```

4. Create and deploy web app:

```bash
# Create web app
az webapp create \
  --resource-group prosync-hub-rg \
  --plan prosync-hub-plan \
  --name prosync-hub \
  --deployment-container-image-name prosynchubacr.azurecr.io/prosync-frontend:latest

# Configure web app settings
az webapp config appsettings set \
  --resource-group prosync-hub-rg \
  --name prosync-hub \
  --settings \
    NEXT_PUBLIC_API_URL=https://prosync-hub-api.azurewebsites.net/api \
    NEXT_PUBLIC_SOCKET_URL=https://prosync-hub-api.azurewebsites.net \
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true \
    NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string \
    WEBSITES_PORT=3000
```

## Step 5: Configure Application Insights Monitoring

```bash
# Get Application Insights key
APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app prosync-hub-insights \
  --resource-group prosync-hub-rg \
  --query instrumentationKey \
  --output tsv)

# Configure backend monitoring
az containerapp update \
  --name prosync-hub-api \
  --resource-group prosync-hub-rg \
  --set-env-vars APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$APP_INSIGHTS_KEY

# Configure frontend monitoring
az webapp config appsettings set \
  --resource-group prosync-hub-rg \
  --name prosync-hub \
  --settings NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$APP_INSIGHTS_KEY
```

## Step 6: Set Up Custom Domain and SSL (Optional)

### Add Custom Domain

```bash
# Add custom domain to frontend
az webapp config hostname add \
  --webapp-name prosync-hub \
  --resource-group prosync-hub-rg \
  --hostname your-domain.com

# Add custom domain to backend
az containerapp hostname add \
  --name prosync-hub-api \
  --resource-group prosync-hub-rg \
  --hostname api.your-domain.com
```

### Add SSL Certificate

```bash
# Create App Service Managed Certificate for frontend
az webapp config ssl create \
  --resource-group prosync-hub-rg \
  --name prosync-hub \
  --hostname your-domain.com

# Bind certificate to frontend
az webapp config ssl bind \
  --resource-group prosync-hub-rg \
  --name prosync-hub \
  --certificate-thumbprint $(az webapp config ssl list --resource-group prosync-hub-rg --webapp-name prosync-hub --query "[?thumbprint!=null].thumbprint" -o tsv) \
  --ssl-type SNI
```

## Step 7: Set Up CI/CD with GitHub Actions

1. Create a `.github/workflows/azure-deploy.yml` file in your repository:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: ACR Login
      uses: azure/docker-login@v1
      with:
        login-server: prosynchubacr.azurecr.io
        username: ${{ secrets.ACR_USERNAME }}
        password: ${{ secrets.ACR_PASSWORD }}
    
    - name: Build and Push Backend Image
      run: |
        docker build -t prosynchubacr.azurecr.io/prosync-backend:latest ./server
        docker push prosynchubacr.azurecr.io/prosync-backend:latest
    
    - name: Build and Push Frontend Image
      run: |
        docker build -t prosynchubacr.azurecr.io/prosync-frontend:latest .
        docker push prosynchubacr.azurecr.io/prosync-frontend:latest
    
    - name: Deploy Backend to Container Apps
      uses: azure/CLI@v1
      with:
        inlineScript: |
          az containerapp update \
            --name prosync-hub-api \
            --resource-group prosync-hub-rg \
            --image prosynchubacr.azurecr.io/prosync-backend:latest
    
    - name: Deploy Frontend to App Service
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'prosync-hub'
        images: 'prosynchubacr.azurecr.io/prosync-frontend:latest'
```

2. Set up GitHub Secrets:
   - AZURE_CREDENTIALS: Azure service principal credentials
   - ACR_USERNAME: Container registry username
   - ACR_PASSWORD: Container registry password

## Step 8: Monitor Your Application

1. Set up Azure Monitor alerts for key metrics:

```bash
# Create an alert rule for high CPU usage
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group prosync-hub-rg \
  --scopes $(az webapp show --resource-group prosync-hub-rg --name prosync-hub --query id -o tsv) \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $(az monitor action-group show --resource-group prosync-hub-rg --name prosync-hub-alerts --query id -o tsv)
```

2. Set up Application Insights dashboard:

```bash
# Create an Application Insights dashboard
az portal dashboard create \
  --resource-group prosync-hub-rg \
  --name "ProSync Hub Monitoring" \
  --location eastus \
  --input-path ./monitoring/dashboard-template.json
```

## Troubleshooting

### Common Deployment Issues

1. **Database Connection Errors**:
   - Verify connection strings in environment variables
   - Check that firewall rules allow connections from Azure services
   - Ensure database user has the proper permissions

2. **Container Startup Issues**:
   - Check container logs: `az containerapp logs show --name prosync-hub-api --resource-group prosync-hub-rg`
   - Verify that all required environment variables are set
   - Check for issues with Docker image builds

3. **Frontend Deployment Issues**:
   - Check App Service logs: `az webapp log tail --name prosync-hub --resource-group prosync-hub-rg`
   - Verify Next.js build configuration
   - Check that container registry authentication is working

4. **Performance Issues**:
   - Review Application Insights metrics for bottlenecks
   - Check database query performance
   - Consider scaling up resources for high-traffic applications

## Maintenance

### Upgrading the Application

1. Build and push new container images with updated tags
2. Update Container Apps and App Service with new image references
3. Monitor application logs during and after upgrades

### Database Backups

Set up automated backups for PostgreSQL:

```bash
# Enable automated backups for PostgreSQL
az postgres server update \
  --resource-group prosync-hub-rg \
  --name prosync-hub-postgres \
  --backup-retention 7
```

Set up automated backups for Cosmos DB:

```bash
# Cosmos DB automatically provides backups
# Verify backup policy settings in Azure Portal
```

## Security Best Practices

1. **Secure Secrets Management**:
   - Store all secrets in Azure Key Vault
   - Use managed identities for Azure resources to access Key Vault
   - Rotate secrets regularly

2. **Network Security**:
   - Configure VNet integration for private connectivity
   - Use Azure Private Link for database connections
   - Implement proper CORS settings

3. **Authentication and Authorization**:
   - Implement proper JWT token validation
   - Consider using Azure AD B2C for user authentication
   - Apply least privilege principle for all service accounts

4. **Compliance and Auditing**:
   - Enable diagnostic logs for all services
   - Set up regular compliance scanning
   - Implement proper data retention policies

## Cost Optimization

1. **Resource Scaling**:
   - Use auto-scaling for App Service and Container Apps
   - Consider serverless options for low-traffic workloads
   - Scale down development/test environments when not in use

2. **Database Optimization**:
   - Use appropriate pricing tiers based on workload
   - Implement proper indexing strategies
   - Consider using Azure Database for PostgreSQL Flexible Server for cost savings

3. **Monitoring and Alerts**:
   - Set up budget alerts in Azure Cost Management
   - Review underutilized resources regularly
   - Consider reserved instances for stable workloads

By following this guide, you should have a fully functional deployment of ProSyncHub on Azure with proper security, monitoring, and maintenance procedures in place.
