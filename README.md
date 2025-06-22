# ProSync Hub - Industrial Asset Management Platform

ProSync Hub is a real-time, full-stack industrial asset management and predictive maintenance platform. The system provides comprehensive features for asset management, real-time IoT data ingestion, predictive maintenance, work order management, and analytics.

## Features

- **Asset Registry & Management**: Track all industrial assets with detailed metadata
- **Real-time IoT Data Ingestion**: Monitor assets in real-time with websocket connections
- **Predictive Maintenance**: ML-powered failure prediction and maintenance scheduling
- **Work Order Management**: Create, assign, and track maintenance work orders
- **Real-time Collaboration**: Live updates across the platform for all users
- **Role-based Access Control**: Secure access based on user roles and permissions
- **Advanced Analytics**: Insights into asset performance and maintenance costs
- **Cloud-ready Architecture**: Deployable to Azure, AWS, or GCP via Docker and Kubernetes

## Technology Stack

### Frontend
- Next.js (React framework)
- TypeScript
- Socket.IO Client
- Tailwind CSS & Shadcn UI components
- React Context API for state management

### Backend
- Express.js
- Socket.IO for real-time communication
- Sequelize ORM (PostgreSQL)
- Mongoose ODM (MongoDB)
- Redis for pub/sub and caching
- JSON Web Tokens (JWT) for authentication

### DevOps
- Docker & Docker Compose
- Kubernetes for orchestration
- GitHub Actions for CI/CD

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- kubectl (for Kubernetes deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-org/prosync-hub.git
cd prosync-hub
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Set up environment variables:
```bash
# Copy the environment variable template files
cp .env.example .env
cp server/.env.example server/.env

# Edit the .env files with your local configuration
```

4. Run the development environment with Docker Compose:
```bash
docker-compose up
```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - API Documentation: http://localhost:5000/api-docs

## Deployment

### Docker Deployment
Build and run Docker containers:
```bash
# Build images
docker build -t prosync-frontend .
docker build -t prosync-backend ./server

# Run containers
docker-compose up -d
```

### Kubernetes Deployment
Deploy to a Kubernetes cluster:
```bash
# Create namespace and deploy infrastructure
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/persistent-volume-claims.yaml
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/mongo.yaml
kubectl apply -f kubernetes/redis.yaml

# Deploy application services
kubectl apply -f kubernetes/backend.yaml
kubectl apply -f kubernetes/frontend.yaml
```

### Cloud Deployment

For cloud-specific deployment instructions, see:
- [Azure Deployment Guide](docs/azure-deployment.md)

## Project Structure

```
├── app/                   # Next.js frontend application
│   ├── analytics/         # Analytics dashboard
│   ├── assets/            # Asset management pages
│   ├── components/        # React components
│   ├── context/           # React context providers
│   ├── lib/               # Utility functions
│   ├── notifications/     # Notification pages
│   ├── security/          # Security settings pages
│   ├── settings/          # Application settings
│   ├── types/             # TypeScript type definitions
│   ├── users/             # User management pages
│   └── work-orders/       # Work order management pages
├── components/            # Shared UI components
├── docs/                  # Documentation
├── kubernetes/            # Kubernetes manifests
├── server/                # Express.js backend
│   ├── src/
│   │   ├── config/        # Server configuration
│   │   ├── controllers/   # API controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── sockets/       # Socket.IO handlers
│   └── tests/             # Backend tests
└── __tests__/             # Frontend tests
```

## API Documentation

Full API documentation is available in the [API Documentation](docs/api-docs.md) file or at the `/api-docs` endpoint when running the server.

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Shadcn UI for component library
- All open-source libraries used in this project
