# Testing ProSyncHub API Documentation

This guide provides steps to verify and test the ProSyncHub API documentation using Swagger UI.

## Prerequisites

- Node.js installed
- ProSyncHub project cloned

## Running the Server

1. Open Command Prompt and navigate to the project directory:
   ```cmd
   cd e:\projects\ProSyncHub\ProSyncHub
   ```

2. Install dependencies (if not already done):
   ```cmd
   npm install
   ```

3. Start the server:
   ```cmd
   npm run dev
   ```

4. Wait for the server to start. You should see output indicating the server is running.

## Accessing Swagger UI

1. Open your web browser and navigate to:
   ```
   http://localhost:5000/api-docs
   ```

2. You should see the Swagger UI interface with all API endpoints documented.

## Testing Authentication

1. Locate the `/api/auth/login` endpoint in the Swagger UI
2. Click on it to expand the details
3. Click "Try it out"
4. Enter valid login credentials in the request body:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
5. Click "Execute"
6. Verify you receive a token in the response
7. Copy the token value (without quotes)
8. Click the "Authorize" button at the top of the page
9. Enter your token in the format: `Bearer YOUR_TOKEN_HERE`
10. Click "Authorize" and close the dialog

## Testing Endpoints

For each major resource type, test at least one endpoint of each HTTP method:

### Assets

- GET `/api/assets` - Should return a list of assets
- GET `/api/assets/{id}` - Should return a single asset
- POST `/api/assets` - Should create a new asset
- PUT `/api/assets/{id}` - Should update an asset
- DELETE `/api/assets/{id}` - Should delete an asset

### Work Orders

- GET `/api/workorders` - Should return a list of work orders
- GET `/api/workorders/{id}` - Should return a single work order
- POST `/api/workorders` - Should create a new work order

### Maintenance Schedules

- GET `/api/maintenance` - Should return a list of maintenance schedules
- POST `/api/maintenance` - Should create a new maintenance schedule

### Notifications

- GET `/api/notifications` - Should return a list of notifications
- PUT `/api/notifications/{id}/read` - Should mark a notification as read

### Sensor Readings

- GET `/api/sensors/{assetId}` - Should return sensor readings for an asset
- POST `/api/sensors` - Should create a new sensor reading

## Verification Checklist

For each endpoint tested, verify:

- [ ] Proper response is returned
- [ ] Response matches the documented schema
- [ ] All documented parameters work as expected
- [ ] Error responses are handled correctly
- [ ] Authentication/authorization is enforced as documented

## Common Issues

1. **Authentication Errors**: If you get 401 responses, ensure your token is valid and properly formatted with "Bearer " prefix.

2. **Schema Validation Errors**: If request validation fails, check that your request body matches the documented schema.

3. **Not Found Errors**: For ID-based requests, ensure you're using a valid ID that exists in the system.

## Reporting Documentation Issues

If you find any discrepancies between the documentation and actual API behavior:

1. Check the `swaggerDef.ts` file
2. Update the documentation to match actual behavior
3. Run validation with `node swagger-validator.js`
4. Test the updated documentation in Swagger UI
