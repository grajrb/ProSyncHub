# ProSyncHub API Documentation Guide

This guide explains how to access, use, and contribute to the ProSyncHub API documentation.

## Accessing the API Documentation

There are two ways to access the API documentation:

1. **Running the Server (Recommended)**
   
   ```cmd
   cd e:\projects\ProSyncHub\ProSyncHub
   npm run dev
   ```
   
   Then open your browser and navigate to:
   http://localhost:5000/api-docs

2. **Static HTML Viewer**
   
   If you just want to browse the API without running the server, open:
   `e:\projects\ProSyncHub\ProSyncHub\server\swagger-test.html`

## Authentication

Most API endpoints require authentication. To test authenticated endpoints:

1. First, use the `/api/auth/login` endpoint to get a JWT token
2. Click the "Authorize" button at the top of the Swagger UI
3. Enter your token in the format: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize" and close the dialog
5. Now you can use any authenticated endpoint

## API Coverage

Our API documentation currently covers:

- **Total API Paths**: 25
- **HTTP Methods**:
  - GET: 22
  - POST: 9
  - PUT: 13
  - DELETE: 4

## Core Resources

The API provides access to these core resources:

| Resource | Base Path | Description |
|----------|-----------|-------------|
| Assets | `/api/assets` | Physical equipment and machinery |
| Work Orders | `/api/workorders` | Maintenance tasks and repairs |
| Maintenance Schedules | `/api/maintenance` | Planned maintenance activities |
| Notifications | `/api/notifications` | System notifications and alerts |
| Sensor Readings | `/api/sensors` | IoT sensor data from assets |
| Users | `/api/users` | User management |
| Locations | `/api/locations` | Physical locations of assets |
| Plants | `/api/plants` | Manufacturing plants or facilities |
| Asset Types | `/api/assettypes` | Categories of assets |

## Contributing to the Documentation

If you need to update the API documentation:

1. Edit the `e:\projects\ProSyncHub\ProSyncHub\server\swaggerDef.ts` file
2. Add or modify the schemas, paths, or security definitions as needed
3. Run the validation script to check your changes:
   ```cmd
   cd e:\projects\ProSyncHub\ProSyncHub\server
   node swagger-validator.js
   ```
4. Test your changes by accessing the Swagger UI

## Best Practices

When adding new API endpoints, make sure to include:

1. Clear summary and description
2. All path and query parameters with types and descriptions
3. Request body schema for POST/PUT methods
4. Response schemas for all status codes
5. Security requirements
6. Tags for categorizing endpoints

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
