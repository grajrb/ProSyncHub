# ProSyncHub Azure AKS Deployment Guide

## Prerequisites
- Azure CLI installed and logged in
- kubectl installed
- Docker installed
- Azure subscription with AKS, PostgreSQL, Cosmos DB, Redis, Application Insights resources created

## 1. Create AKS Cluster
```sh
az aks create --resource-group <rg> --name <aks-name> --node-count 3 --enable-addons monitoring --generate-ssh-keys
az aks get-credentials --resource-group <rg> --name <aks-name>
```

## 2. Set Up Azure Container Registry (ACR)
```sh
az acr create --resource-group <rg> --name <acr-name> --sku Basic
az aks update --name <aks-name> --resource-group <rg> --attach-acr <acr-name>
```

## 3. Build & Push Docker Images
```sh
docker build -t <acr-name>.azurecr.io/prosynchub-client:latest -f ProSyncHub/client/Dockerfile .
docker build -t <acr-name>.azurecr.io/prosynchub-server:latest -f ProSyncHub/server/Dockerfile .
docker push <acr-name>.azurecr.io/prosynchub-client:latest
docker push <acr-name>.azurecr.io/prosynchub-server:latest
```

## 4. Configure Secrets & ConfigMaps
- Create Kubernetes secrets for DB, Redis, Cosmos, App Insights keys:
```sh
kubectl create secret generic prosynchub-secrets \
  --from-literal=POSTGRES_HOST=... \
  --from-literal=POSTGRES_USER=... \
  --from-literal=POSTGRES_PASSWORD=... \
  --from-literal=COSMOSDB_URI=... \
  --from-literal=COSMOSDB_KEY=... \
  --from-literal=REDIS_URL=... \
  --from-literal=APPINSIGHTS_INSTRUMENTATIONKEY=...
```
- Use `k8s-configmap.yaml` and `k8s-secret.yaml` as templates.

## 5. Deploy to AKS
```sh
kubectl apply -f k8s-backend-deployment.yaml
kubectl apply -f k8s-frontend-deployment.yaml
kubectl apply -f k8s-mongodb.yaml
kubectl apply -f k8s-redis.yaml
kubectl apply -f k8s-configmap.yaml
kubectl apply -f k8s-secret.yaml
kubectl apply -f k8s-ingress.yaml
```

## 6. Set Up Monitoring & Logging
- Application Insights is auto-instrumented if env var is set.
- Azure Monitor collects logs/metrics from AKS (see Azure Portal > Monitor > Containers).
- (Optional) Connect Grafana to Azure Monitor for dashboards.

## 7. Verify Deployment
- Check pods: `kubectl get pods`
- Check services: `kubectl get svc`
- Access frontend via Ingress public IP or DNS.

## 8. Troubleshooting
- Use `kubectl logs <pod>` for logs.
- Use Azure Portal for resource health and monitoring.
