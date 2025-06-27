# ProSyncHub Developer Guide

This guide is intended for developers who will be working on the ProSyncHub platform. It includes setup instructions, coding standards, workflow recommendations, and other useful information to help you get started with development.

## Development Environment Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- MongoDB (v5+)
- Redis (v6+)
- Git

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ProSyncHub.git
   cd ProSyncHub
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

4. **Set up environment variables**:
   - Copy `.env.example` to `.env` in the root directory
   - Copy `server/.env.example` to `server/.env`
   - Update the values with your local configuration

5. **Database setup**:
   - Create a PostgreSQL database:
     ```sql
     CREATE DATABASE prosync;
     ```
   - The application will automatically create the tables on first run

6. **Start the development servers**:
   - Backend:
     ```bash
     cd server
     npm run dev
     ```
   - Frontend (in a separate terminal):
     ```bash
     # From the project root
     npm run dev
     ```

7. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API documentation: http://localhost:5000/api-docs

## Project Structure

### Frontend (Next.js)

```
app/                    # Frontend application (Next.js)
├── analytics/          # Analytics dashboard
├── assets/             # Asset management views
├── components/         # Reusable UI components
│   ├── dashboard/      # Dashboard components
│   └── layout/         # Layout components
├── lib/                # Utility functions and shared code
├── notifications/      # Notification center
├── security/           # Security settings
├── settings/           # Application settings
├── types/              # TypeScript type definitions
├── users/              # User management
└── work-orders/        # Work order management
components/             # Shadcn UI components
├── ui/                 # UI components
hooks/                  # Custom React hooks
lib/                    # Utility functions
public/                 # Static assets
```

### Backend (Express)

```
server/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   │   ├── index.js    # Sequelize models
│   │   └── mongodb/    # MongoDB schemas
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── sockets/        # WebSocket handlers
│   └── utils/          # Helper functions
├── tests/              # Backend tests
└── .env                # Backend environment variables
```

## Code Style and Standards

### Frontend

- Use TypeScript for type safety
- Follow the [Next.js best practices](https://nextjs.org/docs/advanced-features/best-practices)
- Use ESLint and Prettier for code formatting
- Use React functional components with hooks
- Use Tailwind CSS for styling

### Backend

- Follow the Express.js best practices
- Use ESLint for code quality
- Implement proper error handling
- Write comprehensive API documentation
- Follow the MVC pattern (Models, Controllers, Routes)

## Database Schema

### PostgreSQL (Relational Data)

Key tables and relationships:

- **Users**: User accounts and authentication
- **Roles**: User roles and permissions
- **Assets**: Industrial equipment and assets
- **AssetTypes**: Types of assets
- **AssetMetrics**: Current asset metrics
- **WorkOrders**: Maintenance work orders
- **WorkOrderItems**: Items in work orders
- **Parts**: Inventory parts
- **Locations**: Physical locations

### MongoDB (Document Data)

Key collections:

- **AssetMetricsHistory**: Historical metrics for assets
- **UserActivityFeed**: User activity logs
- **Notifications**: System notifications
- **WorkOrderComments**: Comments on work orders
- **AuditLogs**: System audit logs

## Authentication and Authorization

### JWT Authentication

ProSyncHub uses JWT tokens for authentication:

1. **Token Generation**: When a user logs in, the server generates a JWT token
2. **Token Storage**: Store the token in a secure HTTP-only cookie or localStorage
3. **Token Validation**: The server validates the token for each protected request
4. **Refresh Tokens**: Long-lived refresh tokens to get new access tokens

### Role-Based Authorization

User roles and permissions:

- **Administrator**: Full system access
- **Manager**: Asset and work order management
- **Technician**: Work order execution and updates
- **Viewer**: Read-only access to assets and work orders

## API Development

### Creating New API Endpoints

1. Define the route in the appropriate route file (`server/src/routes/`)
2. Implement the controller method (`server/src/controllers/`)
3. Add validation if necessary (`server/src/middleware/validation.js`)
4. Update API documentation (`docs/api-docs.md`)

### API Response Format

Standardized API response format:

```javascript
// Success response
res.status(200).json({
  data: {
    // Response data here
  },
  pagination: {
    // Pagination info if applicable
  }
});

// Error response
res.status(errorCode).json({
  error: {
    message: 'Error message',
    code: 'ERROR_CODE',
    details: {} // Optional additional details
  }
});
```

## Frontend Development

### Creating New Pages

1. Create a new page in the appropriate directory (`app/`)
2. Import and use components from the components directory
3. Use data fetching methods from Next.js
4. Add routes to the navigation if necessary

### State Management

- Use React Context for global state
- Use React Query for server state
- Use local state (useState) for component-specific state

### Component Development

- Create reusable components in the components directory
- Document props and behavior
- Make components responsive for all device sizes
- Follow accessibility best practices

## Real-time Features

### Socket.IO

ProSyncHub uses Socket.IO for real-time features:

1. **Connection**: Connect to the WebSocket server
2. **Authentication**: Authenticate the socket connection
3. **Room Subscription**: Join rooms for specific features
4. **Event Handling**: Listen for and emit events

### Real-time Events

Common real-time events:

- **asset_update**: Asset data update
- **work_order_update**: Work order status change
- **notification**: New notification
- **alert**: System alert

## Testing

### Backend Testing

- Unit tests with Jest
- API tests with Supertest
- Run tests with `npm test`

### Frontend Testing

- Component tests with React Testing Library
- End-to-end tests with Cypress
- Run tests with `npm test`

## Deployment

### Docker Deployment

1. Build Docker images:
   ```bash
   docker-compose build
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Kubernetes Deployment

1. Apply Kubernetes configurations:
   ```bash
   kubectl apply -f k8s/
   ```

2. Verify deployment:
   ```bash
   kubectl get pods
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify database credentials in `.env`
   - Ensure database server is running
   - Check network connectivity

2. **Redis Connection Issues**:
   - Verify Redis server is running
   - Check Redis connection settings
   - Ensure proper error handling

3. **Authentication Problems**:
   - Check JWT secret in `.env`
   - Verify token expiration settings
   - Check for proper token storage and usage

### Debugging

- Use console.log for simple debugging
- Use Chrome DevTools for frontend debugging
- Use Node.js debugger for backend debugging

## Contribution Guidelines

### Git Workflow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push your branch and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Request a code review

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if necessary

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
