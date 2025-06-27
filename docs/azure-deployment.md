# Azure Deployment Guide for ProSync Hub

This guide walks through deploying the ProSync Hub application to Azure Cloud Services.

## Architecture Overview

The ProSync Hub deployment on Azure uses the following services:

- **Azure Kubernetes Service (AKS)**: Container orchestration for frontend and backend
- **Azure Container Registry (ACR)**: Private registry for Docker images
- **Azure Database for PostgreSQL**: Relational database for structured data
- **Azure Cosmos DB with MongoDB API**: Document database for IoT data and analytics
- **Azure Cache for Redis**: Caching and real-time messaging
- **Azure Monitor**: Application monitoring and alerting
- **Azure Key Vault**: Secure secret management
- **Azure Application Insights**: Application performance monitoring
- **Azure Blob Storage**: File storage for documents and attachments

## Prerequisites

1. Azure CLI installed and configured
2. kubectl installed
3. Docker installed
4. Access to an Azure subscription with contributor access

## Step 1: Set Up Azure Resources

### Create Resource Group

```bash
# Create a resource group
az group create --name prosync-hub-rg --location eastus
```

### Create Azure Container Registry

```bash
# Create Container Registry
az acr create --resource-group prosync-hub-rg --name prosynchubacr --sku Standard

# Log in to ACR
az acr login --name prosynchubacr
```

### Create Azure Kubernetes Service

```bash
# Create AKS cluster
az aks create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-aks \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --attach-acr prosynchubacr

# Get AKS credentials
az aks get-credentials --resource-group prosync-hub-rg --name prosync-hub-aks
```

### Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-postgres \
  --location eastus \
  --admin-user postgresadmin \
  --admin-password "<your-secure-password>" \
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

### Create Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --resource-group prosync-hub-rg \
  --name prosync-hub-kv \
  --location eastus

# Add secrets
az keyvault secret set --vault-name prosync-hub-kv --name DB-PASSWORD --value "<postgres-password>"
az keyvault secret set --vault-name prosync-hub-kv --name JWT-SECRET --value "<jwt-secret>"
az keyvault secret set --vault-name prosync-hub-kv --name REDIS-PASSWORD --value "<redis-password>"
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

### Create Azure Blob Storage

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
  --name files \
  --account-name prosynchubstorage \
  --auth-mode login
```

## Step 2: Build and Push Docker Images

### Frontend Image

```bash
# Build the frontend image
docker build -t prosynchubacr.azurecr.io/prosync-frontend:latest .

# Push to ACR
docker push prosynchubacr.azurecr.io/prosync-frontend:latest
```

### Backend Image

```bash
# Build the backend image
docker build -t prosynchubacr.azurecr.io/prosync-backend:latest ./server

# Push to ACR
docker push prosynchubacr.azurecr.io/prosync-backend:latest
```

## Step 3: Update Kubernetes Manifests

### Modify the Kubernetes Secret Configuration

Update the `kubernetes/secrets.yaml` file with Azure service connection strings. Use the following commands to get the connection strings:

```bash
# Get PostgreSQL connection string
POSTGRES_HOST=$(az postgres server show --resource-group prosync-hub-rg --name prosync-hub-postgres --query fullyQualifiedDomainName --output tsv)

# Get Cosmos DB connection string
COSMOS_CONNECTION=$(az cosmosdb keys list --type connection-strings --resource-group prosync-hub-rg --name prosync-hub-cosmos --query "connectionStrings[0].connectionString" --output tsv)

# Get Redis connection string
REDIS_CONNECTION=$(az redis list-keys --resource-group prosync-hub-rg --name prosync-hub-redis --query primaryKey --output tsv)

# Get Storage connection string
STORAGE_CONNECTION=$(az storage account show-connection-string --resource-group prosync-hub-rg --name prosynchubstorage --query connectionString --output tsv)

# Get Application Insights connection string
APP_INSIGHTS_KEY=$(az monitor app-insights component show --app prosync-hub-insights --resource-group prosync-hub-rg --query instrumentationKey --output tsv)
```

### Update Image References

Update your Kubernetes manifests to use the ACR images:

```yaml
# In kubernetes/backend.yaml
image: prosynchubacr.azurecr.io/prosync-backend:latest

# In kubernetes/frontend.yaml
image: prosynchubacr.azurecr.io/prosync-frontend:latest
```

## Step 4: Configure Application Monitoring

Add the Application Insights monitoring to your application:

### Backend Monitoring

Add the following to your backend environment variables:

```
APPLICATIONINSIGHTS_CONNECTION_STRING=<app-insights-connection-string>
APPINSIGHTS_INSTRUMENTATIONKEY=<app-insights-key>
```

### Frontend Monitoring

Add the Application Insights script to your frontend application by updating your `next.config.js` to include the script in the HTML head.

## Step 5: Deploy to AKS

```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Create secrets
kubectl apply -f kubernetes/secrets.yaml

# Create persistent volume claims
kubectl apply -f kubernetes/persistent-volume-claims.yaml

# Deploy database services
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/mongo.yaml
kubectl apply -f kubernetes/redis.yaml

# Deploy application services
kubectl apply -f kubernetes/backend.yaml
kubectl apply -f kubernetes/frontend.yaml
```

## Step 6: Set Up Ingress with TLS

### Install NGINX Ingress Controller

```bash
# Add the Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace prosync-hub \
  --set controller.replicaCount=2 \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-dns-label-name"="prosync-hub"
```

### Install Cert Manager

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install Cert Manager
helm install cert-manager jetstack/cert-manager \
  --namespace prosync-hub \
  --version v1.11.0 \
  --set installCRDs=true
```

### Create a ClusterIssuer for Let's Encrypt

Create a file named `cluster-issuer.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-private-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply the ClusterIssuer:

```bash
kubectl apply -f cluster-issuer.yaml
```

### Update the Ingress Configuration

Update your Ingress configuration in `kubernetes/frontend.yaml` to include TLS:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prosync-hub-ingress
  namespace: prosync-hub
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  tls:
  - hosts:
    - prosync-hub.eastus.cloudapp.azure.com
    secretName: prosync-tls-secret
  rules:
  - host: prosync-hub.eastus.cloudapp.azure.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: prosync-backend
            port:
              number: 5000
      - path: /socket.io
        pathType: Prefix
        backend:
          service:
            name: prosync-backend
            port:
              number: 5000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prosync-frontend
            port:
              number: 3000
```

Apply the updated Ingress:

```bash
kubectl apply -f kubernetes/frontend.yaml
```

## Step 7: Set Up CI/CD with GitHub Actions

Update your GitHub Actions workflow file (`.github/workflows/ci-cd.yaml`) to deploy to Azure:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install frontend dependencies
        run: npm ci
        
      - name: Run frontend tests
        run: npm test
        
      - name: Install backend dependencies
        run: cd server && npm ci
        
      - name: Run backend tests
        run: cd server && npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1
      
      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: prosynchubacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      
      - name: Build and push frontend image
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: prosynchubacr.azurecr.io/prosync-frontend:latest,prosynchubacr.azurecr.io/prosync-frontend:${{ github.sha }}
      
      - name: Build and push backend image
        uses: docker/build-push-action@v2
        with:
          context: ./server
          push: true
          tags: prosynchubacr.azurecr.io/prosync-backend:latest,prosynchubacr.azurecr.io/prosync-backend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up kubectl
        uses: azure/setup-kubectl@v1
      
      - name: Set up kubelogin
        uses: azure/use-kubelogin@v1
        with:
          kubelogin-version: 'v0.0.24'
      
      - name: Set up Azure CLI
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Get AKS credentials
        run: az aks get-credentials --resource-group prosync-hub-rg --name prosync-hub-aks
      
      - name: Update image tags in Kubernetes manifests
        run: |
          sed -i "s|prosynchubacr.azurecr.io/prosync-backend:latest|prosynchubacr.azurecr.io/prosync-backend:${{ github.sha }}|g" kubernetes/backend.yaml
          sed -i "s|prosynchubacr.azurecr.io/prosync-frontend:latest|prosynchubacr.azurecr.io/prosync-frontend:${{ github.sha }}|g" kubernetes/frontend.yaml
      
      - name: Deploy to AKS
        run: |
          kubectl apply -f kubernetes/namespace.yaml
          kubectl apply -f kubernetes/secrets.yaml
          kubectl apply -f kubernetes/persistent-volume-claims.yaml
          kubectl apply -f kubernetes/backend.yaml
          kubectl apply -f kubernetes/frontend.yaml
```

## Step 8: Monitor Your Application

1. Set up Azure Monitor alerts for key metrics:

```bash
# Create an alert rule for high CPU usage
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group prosync-hub-rg \
  --scopes $(az aks show --resource-group prosync-hub-rg --name prosync-hub-aks --query id -o tsv) \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $(az monitor action-group show --resource-group prosync-hub-rg --name prosync-hub-alerts --query id -o tsv)
```

2. Configure Application Insights dashboard:

```bash
# Create an Application Insights dashboard
az portal dashboard create \
  --resource-group prosync-hub-rg \
  --name "ProSync Hub Monitoring" \
  --location eastus \
  --input-path ./monitoring/dashboard-template.json
```

## Troubleshooting

### Pod Startup Issues

Check pod status:

```bash
kubectl get pods -n prosync-hub
kubectl describe pod <pod-name> -n prosync-hub
kubectl logs <pod-name> -n prosync-hub
```

### Database Connection Issues

Verify connection strings in secrets:

```bash
kubectl get secret prosync-secrets -n prosync-hub -o yaml
```

### Ingress Issues

Check Ingress status:

```bash
kubectl get ingress -n prosync-hub
kubectl describe ingress prosync-hub-ingress -n prosync-hub
```

## Maintenance

### Upgrading the Application

1. Build and push new container images
2. Update Kubernetes manifests with new image tags
3. Apply the updated manifests

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
# Set backup policy for Cosmos DB
az cosmosdb update \
  --name prosync-hub-cosmos \
  --resource-group prosync-hub-rg \
  --backup-interval 24 \
  --backup-retention 7
```

## Security Best Practices

1. **Regularly rotate credentials**:
   
   ```bash
   # Rotate PostgreSQL admin password
   az postgres server update \
     --resource-group prosync-hub-rg \
     --name prosync-hub-postgres \
     --admin-password "<new-password>"
   
   # Update the secret in Key Vault
   az keyvault secret set \
     --vault-name prosync-hub-kv \
     --name DB-PASSWORD \
     --value "<new-password>"
   ```

2. **Enable advanced threat protection**:

   ```bash
   # Enable Advanced Threat Protection for PostgreSQL
   az postgres server threat-protection update \
     --resource-group prosync-hub-rg \
     --server-name prosync-hub-postgres \
     --state Enabled
   ```

3. **Configure network security**:

   ```bash
   # Restrict network access to PostgreSQL
   az postgres server firewall-rule delete \
     --resource-group prosync-hub-rg \
     --server-name prosync-hub-postgres \
     --name AllowAllAzureIPs
   
   # Add specific IP ranges instead
   az postgres server vnet-rule create \
     --resource-group prosync-hub-rg \
     --server-name prosync-hub-postgres \
     --name AllowAKS \
     --subnet-id $(az network vnet subnet show --resource-group prosync-hub-rg --vnet-name prosync-hub-vnet --name aks-subnet --query id -o tsv)
   ```

## Cost Optimization

1. **Right-size your AKS cluster**:

   ```bash
   # Scale down during off-hours
   az aks update \
     --resource-group prosync-hub-rg \
     --name prosync-hub-aks \
     --node-count 1
   ```

2. **Use autoscaling**:

   ```bash
   # Enable cluster autoscaler
   az aks update \
     --resource-group prosync-hub-rg \
     --name prosync-hub-aks \
     --enable-cluster-autoscaler \
     --min-count 1 \
     --max-count 5
   ```

3. **Review and clean up unused resources**:

   ```bash
   # List unused disks
   az disk list --query "[?diskState=='Unattached']"
   
   # Delete unused disks
   az disk delete --ids $(az disk list --query "[?diskState=='Unattached'].id" -o tsv)
   ```
