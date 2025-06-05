// OpenAPI/Swagger definition for ProSync Hub backend
// This file will be referenced by swagger-jsdoc in index.ts

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ProSync Hub API',
    version: '1.0.0',
    description: 'API documentation for ProSync Hub industrial asset management platform.',
    contact: {
      name: 'Support',
      email: 'support@prosynchub.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    },
    {
      url: 'https://api.prosynchub.com',
      description: 'Production Server'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'Authentication operations' },
    { name: 'Users', description: 'User management' },
    { name: 'Assets', description: 'Asset management' },
    { name: 'Sensors', description: 'Sensor data operations' },
    { name: 'Maintenance', description: 'Maintenance operations' },
    { name: 'Checklists', description: 'Maintenance checklists' },
    { name: 'Analytics', description: 'Data analytics and reporting' },
    { name: 'Notifications', description: 'System notifications' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        required: ['username', 'email', 'password', 'role'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
          lastLogin: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      AssetSensorData: {
        type: 'object',
        required: ['assetId', 'sensorId', 'sensorType', 'value', 'unit'],
        properties: {
          id: { type: 'string' },
          assetId: { type: 'string' },
          sensorId: { type: 'string' },
          sensorType: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['normal', 'warning', 'critical'] },
          metadata: { type: 'object', additionalProperties: true }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string', format: 'password' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          code: { type: 'integer', format: 'int32' }
        }
      },
      AnalyticsQuery: {
        type: 'object',
        properties: {
          assetId: { type: 'string' },
          sensorTypes: { type: 'array', items: { type: 'string' } },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          interval: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
          aggregation: { type: 'string', enum: ['avg', 'min', 'max', 'sum', 'count'] }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ],
  // The paths section will be populated by route annotations
};

export const apis = [
  './server/routes/**/*.ts', 
  './server/routes.ts', 
  './server/authRoutes.ts',
  './server/mongoRoutes.ts'
];
