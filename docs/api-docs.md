# ProSync Hub API Documentation

This document provides comprehensive documentation for the ProSync Hub API. All endpoints require authentication unless otherwise specified.

## Base URL

```
https://api.prosync.example.com/api
```

For local development:
```
http://localhost:5000/api
```

## Authentication

### JWT Authentication

ProSync Hub uses JSON Web Tokens (JWT) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Login

```
POST /auth/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### Register

```
POST /auth/register
```

Request body:
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "role": "technician"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "technician"
  }
}
```

#### Verify Token

```
GET /auth/verify
```

Response:
```json
{
  "valid": true,
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

## Asset Management

### Get All Assets

```
GET /assets
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `status`: Filter by status
- `type`: Filter by asset type
- `search`: Search term

Response:
```json
{
  "assets": [
    {
      "id": "1",
      "name": "Pump Station Alpha",
      "type": "pump",
      "model": "XYZ-123",
      "status": "operational",
      "healthScore": 89,
      "lastMaintenance": "2023-10-15T10:30:00Z",
      "location": {
        "facility": "Plant 1",
        "area": "Section A"
      },
      "metrics": {
        "temperature": 75.2,
        "pressure": 120.5,
        "vibration": 0.23
      }
    },
    // More assets...
  ],
  "pagination": {
    "total": 125,
    "page": 1,
    "limit": 10,
    "pages": 13
  }
}
```

### Get Asset by ID

```
GET /assets/:id
```

Response:
```json
{
  "id": "1",
  "name": "Pump Station Alpha",
  "type": "pump",
  "model": "XYZ-123",
  "status": "operational",
  "healthScore": 89,
  "lastMaintenance": "2023-10-15T10:30:00Z",
  "location": {
    "facility": "Plant 1",
    "area": "Section A"
  },
  "metrics": {
    "temperature": 75.2,
    "pressure": 120.5,
    "vibration": 0.23
  },
  "maintenanceHistory": [
    {
      "id": "1",
      "date": "2023-10-15T10:30:00Z",
      "type": "preventive",
      "technician": "John Smith",
      "notes": "Replaced filter and lubricated bearings"
    }
  ],
  "documents": [
    {
      "id": "1",
      "name": "Operating Manual",
      "type": "pdf",
      "url": "/documents/1.pdf"
    }
  ]
}
```

### Create Asset

```
POST /assets
```

Request body:
```json
{
  "name": "Pump Station Beta",
  "type": "pump",
  "model": "XYZ-456",
  "status": "operational",
  "location": {
    "facility": "Plant 1",
    "area": "Section B"
  }
}
```

Response:
```json
{
  "message": "Asset created successfully",
  "asset": {
    "id": "2",
    "name": "Pump Station Beta",
    "type": "pump",
    "model": "XYZ-456",
    "status": "operational",
    "healthScore": 100,
    "location": {
      "facility": "Plant 1",
      "area": "Section B"
    }
  }
}
```

### Update Asset

```
PUT /assets/:id
```

Request body:
```json
{
  "status": "maintenance",
  "metrics": {
    "temperature": 80.5,
    "pressure": 125.3,
    "vibration": 0.30
  }
}
```

Response:
```json
{
  "message": "Asset updated successfully",
  "asset": {
    "id": "1",
    "name": "Pump Station Alpha",
    "status": "maintenance",
    "metrics": {
      "temperature": 80.5,
      "pressure": 125.3,
      "vibration": 0.30
    },
    // other fields...
  }
}
```

### Delete Asset

```
DELETE /assets/:id
```

Response:
```json
{
  "message": "Asset deleted successfully"
}
```

## Work Order Management

### Get All Work Orders

```
GET /work-orders
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `status`: Filter by status
- `priority`: Filter by priority
- `assignee`: Filter by assignee ID
- `asset`: Filter by asset ID

Response:
```json
{
  "workOrders": [
    {
      "id": "1",
      "title": "Repair Pump Station Alpha",
      "description": "High vibration detected, requires inspection",
      "status": "open",
      "priority": "high",
      "asset": {
        "id": "1",
        "name": "Pump Station Alpha"
      },
      "assignee": {
        "id": "2",
        "name": "Jane Smith"
      },
      "createdAt": "2023-11-01T08:30:00Z",
      "dueDate": "2023-11-03T17:00:00Z"
    },
    // More work orders...
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### Get Work Order by ID

```
GET /work-orders/:id
```

Response:
```json
{
  "id": "1",
  "title": "Repair Pump Station Alpha",
  "description": "High vibration detected, requires inspection",
  "status": "open",
  "priority": "high",
  "asset": {
    "id": "1",
    "name": "Pump Station Alpha"
  },
  "assignee": {
    "id": "2",
    "name": "Jane Smith"
  },
  "createdAt": "2023-11-01T08:30:00Z",
  "dueDate": "2023-11-03T17:00:00Z",
  "tasks": [
    {
      "id": "1",
      "description": "Inspect bearings",
      "completed": false
    },
    {
      "id": "2",
      "description": "Check lubrication system",
      "completed": true
    }
  ],
  "comments": [
    {
      "id": "1",
      "user": {
        "id": "3",
        "name": "Mike Johnson"
      },
      "text": "Parts ordered, will arrive tomorrow",
      "createdAt": "2023-11-01T15:45:00Z"
    }
  ]
}
```

### Create Work Order

```
POST /work-orders
```

Request body:
```json
{
  "title": "Replace Motor Bearings",
  "description": "Preventive maintenance for motor bearings",
  "priority": "medium",
  "assetId": "1",
  "assigneeId": "2",
  "dueDate": "2023-11-10T17:00:00Z",
  "tasks": [
    {
      "description": "Disconnect power"
    },
    {
      "description": "Remove motor cover"
    },
    {
      "description": "Replace bearings"
    }
  ]
}
```

Response:
```json
{
  "message": "Work order created successfully",
  "workOrder": {
    "id": "2",
    "title": "Replace Motor Bearings",
    "description": "Preventive maintenance for motor bearings",
    "status": "open",
    "priority": "medium",
    "asset": {
      "id": "1",
      "name": "Pump Station Alpha"
    },
    "assignee": {
      "id": "2",
      "name": "Jane Smith"
    },
    "createdAt": "2023-11-02T09:15:00Z",
    "dueDate": "2023-11-10T17:00:00Z",
    "tasks": [
      {
        "id": "3",
        "description": "Disconnect power",
        "completed": false
      },
      {
        "id": "4",
        "description": "Remove motor cover",
        "completed": false
      },
      {
        "id": "5",
        "description": "Replace bearings",
        "completed": false
      }
    ]
  }
}
```

### Update Work Order

```
PUT /work-orders/:id
```

Request body:
```json
{
  "status": "in-progress",
  "tasks": [
    {
      "id": "1",
      "completed": true
    }
  ]
}
```

Response:
```json
{
  "message": "Work order updated successfully",
  "workOrder": {
    "id": "1",
    "status": "in-progress",
    "tasks": [
      {
        "id": "1",
        "description": "Inspect bearings",
        "completed": true
      },
      {
        "id": "2",
        "description": "Check lubrication system",
        "completed": true
      }
    ],
    // other fields...
  }
}
```

## User Management

### Get All Users

```
GET /users
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `role`: Filter by role
- `search`: Search by name or email

Response:
```json
{
  "users": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "department": "Maintenance",
      "createdAt": "2023-01-15T10:30:00Z"
    },
    // More users...
  ],
  "pagination": {
    "total": 35,
    "page": 1,
    "limit": 10,
    "pages": 4
  }
}
```

### Get User by ID

```
GET /users/:id
```

Response:
```json
{
  "id": "1",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "department": "Maintenance",
  "phone": "555-123-4567",
  "createdAt": "2023-01-15T10:30:00Z",
  "lastLogin": "2023-11-01T08:15:00Z"
}
```

## Analytics

### Get Asset Performance Metrics

```
GET /analytics/asset-performance
```

Query parameters:
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)
- `assetId`: (optional) Filter by specific asset

Response:
```json
{
  "timeframe": {
    "start": "2023-10-01",
    "end": "2023-10-31"
  },
  "assets": [
    {
      "id": "1",
      "name": "Pump Station Alpha",
      "uptime": 98.5,
      "downtime": 1.5,
      "maintenanceCost": 1250.75,
      "failureRate": 0.02,
      "efficiencyScore": 92.3
    },
    // More assets...
  ],
  "summary": {
    "totalAssets": 15,
    "averageUptime": 97.2,
    "totalMaintenanceCost": 15780.50,
    "criticalAssets": 3
  }
}
```

### Get Maintenance Metrics

```
GET /analytics/maintenance
```

Query parameters:
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)

Response:
```json
{
  "timeframe": {
    "start": "2023-10-01",
    "end": "2023-10-31"
  },
  "workOrders": {
    "total": 45,
    "open": 12,
    "inProgress": 8,
    "completed": 25,
    "byPriority": {
      "high": 15,
      "medium": 20,
      "low": 10
    },
    "averageResolutionTime": 36.5,
    "complianceRate": 92.5
  },
  "costs": {
    "total": 28500.75,
    "byCategory": {
      "labor": 15600.50,
      "parts": 10200.25,
      "other": 2700.00
    }
  }
}
```

## Predictive Maintenance

### Get Failure Predictions

```
GET /predictive/predictions
```

Query parameters:
- `assetId`: (optional) Filter by specific asset
- `riskLevel`: (optional) Filter by risk level (high, medium, low)
- `timeframe`: (optional) Prediction timeframe in days (default: 30)

Response:
```json
{
  "predictions": [
    {
      "asset": {
        "id": "1",
        "name": "Pump Station Alpha"
      },
      "component": "Bearing Assembly",
      "failureProbability": 0.75,
      "riskLevel": "high",
      "estimatedTimeToFailure": 15.3,
      "recommendedAction": "Replace bearings within 1 week",
      "contributingFactors": [
        {
          "factor": "Vibration",
          "currentValue": 0.38,
          "threshold": 0.25,
          "weight": 0.6
        },
        {
          "factor": "Temperature",
          "currentValue": 92.5,
          "threshold": 85.0,
          "weight": 0.4
        }
      ]
    },
    // More predictions...
  ]
}
```

## Notifications

### Get User Notifications

```
GET /notifications
```

Query parameters:
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `read`: (optional) Filter by read status (true/false)

Response:
```json
{
  "notifications": [
    {
      "id": "1",
      "type": "work_order_assigned",
      "title": "New Work Order Assigned",
      "message": "You have been assigned to work order #1234",
      "read": false,
      "createdAt": "2023-11-02T14:30:00Z",
      "data": {
        "workOrderId": "1234",
        "workOrderTitle": "Repair Pump Station Alpha"
      }
    },
    // More notifications...
  ],
  "pagination": {
    "total": 35,
    "page": 1,
    "limit": 20,
    "pages": 2
  },
  "unreadCount": 5
}
```

### Mark Notification as Read

```
PUT /notifications/:id/read
```

Response:
```json
{
  "message": "Notification marked as read",
  "notification": {
    "id": "1",
    "read": true,
    // other fields...
  }
}
```

### Mark All Notifications as Read

```
PUT /notifications/read-all
```

Response:
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

## WebSocket Events

Connect to the WebSocket server:

```javascript
const socket = io('https://api.prosync.example.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Asset Updates

```javascript
// Listen for asset updates
socket.on('asset:update', (data) => {
  console.log('Asset updated:', data);
  // {
  //   id: '1',
  //   status: 'operational',
  //   metrics: {
  //     temperature: 75.2,
  //     pressure: 120.5,
  //     vibration: 0.23
  //   },
  //   timestamp: '2023-11-02T15:30:00Z'
  // }
});

// Listen for asset status changes
socket.on('asset:status', (data) => {
  console.log('Asset status changed:', data);
  // {
  //   id: '1',
  //   status: 'alarm',
  //   previousStatus: 'operational',
  //   reason: 'High temperature detected',
  //   timestamp: '2023-11-02T15:35:00Z'
  // }
});
```

### Work Order Updates

```javascript
// Listen for work order updates
socket.on('workOrder:update', (data) => {
  console.log('Work order updated:', data);
  // {
  //   id: '1',
  //   status: 'in-progress',
  //   updatedBy: {
  //     id: '2',
  //     name: 'Jane Smith'
  //   },
  //   timestamp: '2023-11-02T15:40:00Z'
  // }
});

// Listen for new work order assignments
socket.on('workOrder:assign', (data) => {
  console.log('Work order assigned:', data);
  // {
  //   id: '2',
  //   title: 'Replace Motor Bearings',
  //   priority: 'medium',
  //   assignee: {
  //     id: '2',
  //     name: 'Jane Smith'
  //   },
  //   timestamp: '2023-11-02T15:45:00Z'
  // }
});
```

### Notifications

```javascript
// Listen for new notifications
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
  // {
  //   id: '1',
  //   type: 'work_order_assigned',
  //   title: 'New Work Order Assigned',
  //   message: 'You have been assigned to work order #1234',
  //   read: false,
  //   createdAt: '2023-11-02T14:30:00Z',
  //   data: {
  //     workOrderId: '1234',
  //     workOrderTitle: 'Repair Pump Station Alpha'
  //   }
  // }
});
```

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": "Asset with id 999 does not exist"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required or invalid token
- `FORBIDDEN`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_SERVER_ERROR`: Server encountered an error

HTTP status codes are also used appropriately:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
