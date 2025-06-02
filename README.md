# ProSync Hub

A secure, scalable, and real-time full-stack application for industrial asset management, predictive maintenance, and team collaboration.

## Features
- Asset registry & hierarchy (CRUD, parent-child, QR code, docs)
- Real-time IoT data ingestion & monitoring (Socket.IO, MongoDB, Redis)
- Predictive maintenance (rule-based, trend analysis)
- Maintenance scheduling & work order management
- Real-time collaboration & notifications
- Role-based access control
- Reporting & analytics

## Tech Stack
- **Frontend:** React, Next.js, Redux, shadcn/ui, Tailwind CSS
- **Backend:** Node.js (Express), Socket.IO
- **Databases:** PostgreSQL, MongoDB, Redis
- **DevOps/Cloud:** Docker, Kubernetes (AKS), Azure DB for PostgreSQL, Cosmos DB, Azure Cache for Redis, Azure Monitor

## Local Development
1. Install dependencies:
   ```cmd
   npm install
   ```
2. Start backend:
   ```cmd
   cd server
   npm run dev
   ```
3. Start frontend:
   ```cmd
   cd client
   npm run dev
   ```

## Docker
- Build frontend: `cd client && docker build -t prosync-frontend .`
- Build backend: `cd server && docker build -t prosync-backend .`

## Kubernetes (AKS)
- See `k8s-*.yaml` files for manifests (Deployment, Service, Ingress, ConfigMap, Secret)
- Update image names and secrets as needed
- Deploy with:
  ```cmd
  kubectl apply -f k8s-configmap.yaml
  kubectl apply -f k8s-secret.yaml
  kubectl apply -f k8s-frontend-deployment.yaml
  kubectl apply -f k8s-backend-deployment.yaml
  kubectl apply -f k8s-ingress.yaml
  ```

## CI/CD
- See `.github/workflows/ci-cd.yaml` for GitHub Actions pipeline

## Azure Integration
- Use Azure DB for PostgreSQL, Cosmos DB (MongoDB API), Azure Cache for Redis
- Configure connection strings in Kubernetes secrets
- Use Azure Monitor for metrics/logs

## API Documentation
- REST API: See backend code and [OpenAPI/Swagger documentation](http://localhost:5000/api-docs)

## Architecture
- See `attached_assets/Pasted-Full-Stack-Developer-Assignment-ProSync-Hub-Real-time-Collaborative-Industrial-Asset-Management--1748620520729.txt` for LLD, DB schema, and diagrams

## License

This project is licensed under the [MIT License](./LICENSE).

---
For more details, see code comments and in-line documentation.
