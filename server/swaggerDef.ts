// OpenAPI/Swagger definition for ProSync Hub backend
// This file will be referenced by swagger-jsdoc in index.ts

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ProSync Hub API',
    version: '1.0.0',
    description: 'API documentation for ProSync Hub industrial asset management platform.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local server'
    }
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
      // Asset schemas
      Asset: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          assetTag: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          model: { type: 'string' },
          manufacturer: { type: 'string' },
          serialNumber: { type: 'string' },
          installationDate: { type: 'string', format: 'date' },
          locationId: { type: 'integer' },
          assetTypeId: { type: 'integer' },
          parentAssetId: { type: 'integer', nullable: true },
          currentStatus: { 
            type: 'string', 
            enum: ['operational', 'maintenance', 'offline', 'error'],
            default: 'operational'
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'assetTag', 'name', 'locationId', 'assetTypeId']
      },
      AssetInput: {
        type: 'object',
        properties: {
          assetTag: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          model: { type: 'string' },
          manufacturer: { type: 'string' },
          serialNumber: { type: 'string' },
          installationDate: { type: 'string', format: 'date' },
          locationId: { type: 'integer' },
          assetTypeId: { type: 'integer' },
          parentAssetId: { type: 'integer', nullable: true },
          currentStatus: { 
            type: 'string', 
            enum: ['operational', 'maintenance', 'offline', 'error']
          }
        },
        required: ['assetTag', 'name', 'locationId', 'assetTypeId']
      },
      
      // Work Order schemas
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          assetId: { type: 'integer' },
          status: { 
            type: 'string', 
            enum: ['open', 'in_progress', 'completed', 'cancelled'],
            default: 'open'
          },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
          },
          type: { 
            type: 'string', 
            enum: ['preventive', 'corrective', 'emergency'],
            default: 'corrective'
          },
          assignedToUserId: { type: 'string', nullable: true },
          reportedByUserId: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date-time', nullable: true },
          completionDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'title', 'assetId', 'reportedByUserId']
      },
      WorkOrderInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assetId: { type: 'integer' },
          status: { 
            type: 'string', 
            enum: ['open', 'in_progress', 'completed', 'cancelled']
          },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high', 'critical']
          },
          type: { 
            type: 'string', 
            enum: ['preventive', 'corrective', 'emergency']
          },
          assignedToUserId: { type: 'string' },
          reportedByUserId: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date-time' },
          completionDate: { type: 'string', format: 'date-time' }
        },
        required: ['title', 'assetId', 'reportedByUserId']
      },
      
      // Maintenance Schedule schemas
      MaintenanceSchedule: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          assetId: { type: 'integer' },
          taskDescription: { type: 'string' },
          frequency: { type: 'string' },
          nextDueDate: { type: 'string', format: 'date' },
          lastPerformedDate: { type: 'string', format: 'date', nullable: true },
          isActive: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'assetId', 'taskDescription', 'frequency', 'nextDueDate']
      },
      MaintenanceScheduleInput: {
        type: 'object',
        properties: {
          assetId: { type: 'integer' },
          taskDescription: { type: 'string' },
          frequency: { type: 'string' },
          nextDueDate: { type: 'string', format: 'date' },
          lastPerformedDate: { type: 'string', format: 'date' },
          isActive: { type: 'boolean' }
        },
        required: ['assetId', 'taskDescription', 'frequency', 'nextDueDate']
      },
      
      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['info', 'warning', 'error', 'success'],
            default: 'info'
          },
          isRead: { type: 'boolean', default: false },
          relatedEntityType: { type: 'string', nullable: true },
          relatedEntityId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'userId', 'title', 'message']
      },
      NotificationInput: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { 
            type: 'string', 
            enum: ['info', 'warning', 'error', 'success']
          },
          relatedEntityType: { type: 'string' },
          relatedEntityId: { type: 'integer' }
        },
        required: ['userId', 'title', 'message']
      },
      
      // Asset Sensor Reading schemas
      AssetSensorReading: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          assetId: { type: 'integer' },
          sensorType: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'assetId', 'sensorType', 'value', 'unit']
      },
      AssetSensorReadingInput: {
        type: 'object',
        properties: {
          assetId: { type: 'integer' },
          sensorType: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' }
        },
        required: ['assetId', 'sensorType', 'value', 'unit']
      },
      
      // User schemas      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          profileImageUrl: { type: 'string' },
          roleId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id']
      },
      
      // Location schema
      Location: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          plantId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'plantId']
      },
      LocationInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          plantId: { type: 'integer' }
        },
        required: ['name', 'plantId']
      },
      
      // Plant schema
      Plant: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          address: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name']
      },
      PlantInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' }
        },
        required: ['name']
      },
      
      // Asset Type schema
      AssetType: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['id', 'name']
      },
      AssetTypeInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['name']
      },
      
      // Role schema
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['id', 'name']
      },
      
      // Error response
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        required: ['message']
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],  paths: {
    // Asset endpoints
    '/api/assets': {
      get: {
        summary: 'Get a list of assets',
        tags: ['Assets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'locationId',
            schema: { type: 'integer' },
            description: 'Filter by location ID'
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['operational', 'maintenance', 'offline', 'error'] },
            description: 'Filter by asset status'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer' },
            description: 'Limit number of results'
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer' },
            description: 'Offset for pagination'
          }
        ],
        responses: {
          '200': {
            description: 'List of assets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Asset' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new asset',
        tags: ['Assets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssetInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Asset created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' }
              }
            }
          },
          '400': { description: 'Invalid asset data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/assets/{id}': {
      get: {
        summary: 'Get asset by ID',
        tags: ['Assets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Asset ID'
          }
        ],
        responses: {
          '200': {
            description: 'Asset details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Asset not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update asset by ID',
        tags: ['Assets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Asset ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssetInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Asset updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' }
              }
            }
          },
          '400': { description: 'Invalid asset data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Asset not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete asset by ID',
        tags: ['Assets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Asset ID'
          }
        ],
        responses: {
          '204': { description: 'Asset deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Asset not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    
    // Work Order endpoints
    '/api/work-orders': {
      get: {
        summary: 'Get a list of work orders',
        tags: ['WorkOrders'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['open', 'in_progress', 'completed', 'cancelled'] },
            description: 'Filter by status'
          },
          {
            in: 'query',
            name: 'assignedToUserId',
            schema: { type: 'string' },
            description: 'Filter by assigned user'
          },
          {
            in: 'query',
            name: 'assetId',
            schema: { type: 'integer' },
            description: 'Filter by asset'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer' },
            description: 'Limit number of results'
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer' },
            description: 'Offset for pagination'
          }
        ],
        responses: {
          '200': {
            description: 'List of work orders',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/WorkOrder' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new work order',
        tags: ['WorkOrders'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkOrderInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Work order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkOrder' }
              }
            }
          },
          '400': { description: 'Invalid work order data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/work-orders/{id}': {
      get: {
        summary: 'Get work order by ID',
        tags: ['WorkOrders'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Work Order ID'
          }
        ],
        responses: {
          '200': {
            description: 'Work order details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkOrder' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Work order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update work order by ID',
        tags: ['WorkOrders'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Work Order ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkOrderInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Work order updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkOrder' }
              }
            }
          },
          '400': { description: 'Invalid work order data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Work order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete work order by ID',
        tags: ['WorkOrders'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Work Order ID'
          }
        ],
        responses: {
          '204': { description: 'Work order deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Work order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
      // Maintenance Schedule endpoints
    '/api/maintenance-schedules': {
      get: {
        summary: 'Get a list of maintenance schedules',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'assetId',
            schema: { type: 'integer' },
            description: 'Filter by asset'
          },
          {
            in: 'query',
            name: 'overdue',
            schema: { type: 'boolean' },
            description: 'Filter overdue schedules'
          }
        ],
        responses: {
          '200': {
            description: 'List of maintenance schedules',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MaintenanceSchedule' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new maintenance schedule',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaintenanceScheduleInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Maintenance schedule created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MaintenanceSchedule' }
              }
            }
          },
          '400': { description: 'Invalid schedule data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/maintenance-schedules/{id}': {
      get: {
        summary: 'Get maintenance schedule by ID',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Maintenance Schedule ID'
          }
        ],
        responses: {
          '200': {
            description: 'Maintenance schedule details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MaintenanceSchedule' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Maintenance schedule not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update maintenance schedule by ID',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Maintenance Schedule ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaintenanceScheduleInput' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Maintenance schedule updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MaintenanceSchedule' }
              }
            }
          },
          '400': { description: 'Invalid schedule data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Maintenance schedule not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete maintenance schedule by ID',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Maintenance Schedule ID'
          }
        ],
        responses: {
          '204': { description: 'Maintenance schedule deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Maintenance schedule not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/assets/{assetId}/maintenance-schedules': {
      get: {
        summary: 'Get maintenance schedules for a specific asset',
        tags: ['MaintenanceSchedules'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'assetId',
            required: true,
            schema: { type: 'integer' },
            description: 'Asset ID'
          },
          {
            in: 'query',
            name: 'overdue',
            schema: { type: 'boolean' },
            description: 'Filter overdue schedules'
          }
        ],
        responses: {
          '200': {
            description: 'List of maintenance schedules for the asset',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MaintenanceSchedule' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Asset not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
      // Notification endpoints
    '/api/notifications': {
      get: {
        summary: 'Get notifications for the current user',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'unreadOnly',
            schema: { type: 'boolean' },
            description: 'Only unread notifications'
          }
        ],
        responses: {
          '200': {
            description: 'List of notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Notification' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a notification',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Notification created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Notification' }
              }
            }
          },
          '400': { description: 'Invalid notification data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/notifications/{id}': {
      get: {
        summary: 'Get notification by ID',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Notification ID'
          }
        ],
        responses: {
          '200': {
            description: 'Notification details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Notification' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Notification not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Mark notification as read/unread',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Notification ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isRead: { type: 'boolean' }
                },
                required: ['isRead']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Notification updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Notification' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Notification not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        summary: 'Delete notification',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Notification ID'
          }
        ],
        responses: {
          '204': { description: 'Notification deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Notification not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
      // Asset Sensor Reading endpoints
    '/api/asset-sensor-readings': {
      get: {
        summary: 'Get sensor readings for assets',
        tags: ['AssetSensorReadings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'assetId',
            schema: { type: 'integer' },
            description: 'Filter by asset ID'
          },
          {
            in: 'query',
            name: 'sensorType',
            schema: { type: 'string' },
            description: 'Filter by sensor type'
          },
          {
            in: 'query',
            name: 'startDate',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter readings after this date'
          },
          {
            in: 'query',
            name: 'endDate',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter readings before this date'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer' },
            description: 'Limit number of results'
          }
        ],
        responses: {
          '200': {
            description: 'List of sensor readings',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AssetSensorReading' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        summary: 'Create a new sensor reading',
        tags: ['AssetSensorReadings'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssetSensorReadingInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Sensor reading created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssetSensorReading' }
              }
            }
          },
          '400': { description: 'Invalid sensor reading data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/asset-sensor-readings/{id}': {
      get: {
        summary: 'Get sensor reading by ID',
        tags: ['AssetSensorReadings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'Sensor Reading ID'
          }
        ],
        responses: {
          '200': {
            description: 'Sensor reading details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AssetSensorReading' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Sensor reading not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/assets/{assetId}/sensor-readings': {
      get: {
        summary: 'Get sensor readings for a specific asset',
        tags: ['AssetSensorReadings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'assetId',
            required: true,
            schema: { type: 'integer' },
            description: 'Asset ID'
          },
          {
            in: 'query',
            name: 'sensorType',
            schema: { type: 'string' },
            description: 'Filter by sensor type'
          },
          {
            in: 'query',
            name: 'startDate',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter readings after this date'
          },
          {
            in: 'query',
            name: 'endDate',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter readings before this date'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer' },
            description: 'Limit number of results'
          }
        ],
        responses: {
          '200': {
            description: 'List of sensor readings for the asset',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AssetSensorReading' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Asset not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
      // User endpoints
    '/api/users': {
      get: {
        summary: 'Get a list of users',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'roleId',
            schema: { type: 'integer' },
            description: 'Filter by role ID'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer' },
            description: 'Limit number of results'
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer' },
            description: 'Offset for pagination'
          }
        ],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get user by ID',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'User ID'
          }
        ],
        responses: {
          '200': {
            description: 'User details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      put: {
        summary: 'Update user by ID',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'User ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  profileImageUrl: { type: 'string' },
                  roleId: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'User updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '400': { description: 'Invalid user data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/users/current': {
      get: {
        summary: 'Get current user profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },    // Authentication endpoints
    '/api/auth/login': {
      post: {
        summary: 'Login to the system',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                },
                required: ['email', 'password', 'firstName', 'lastName']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid registration data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Refresh authentication token',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { description: 'Invalid or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    
    // Asset Type endpoints
    '/api/asset-types': {
      get: {
        summary: 'Get a list of asset types',
        tags: ['AssetTypes'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of asset types',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    
    // Location endpoints
    '/api/locations': {
      get: {
        summary: 'Get a list of locations',
        tags: ['Locations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'plantId',
            schema: { type: 'integer' },
            description: 'Filter by plant ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of locations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      plantId: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    
    // Plant endpoints
    '/api/plants': {
      get: {
        summary: 'Get a list of plants',
        tags: ['Plants'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of plants',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      address: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
      // WebSocket endpoint
    '/ws': {
      get: {
        summary: 'WebSocket connection for real-time updates',
        tags: ['WebSocket'],
        description: 'Connect to this endpoint using a WebSocket client to receive real-time updates about assets, work orders, etc.',
        responses: {
          '101': {
            description: 'Switching Protocols - WebSocket connection established'
          }
        }
      }
    },
    
    // Analytics endpoints
    '/api/analytics/asset-status': {
      get: {
        summary: 'Get asset status distribution',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'locationId',
            schema: { type: 'integer' },
            description: 'Filter by location ID'
          }
        ],
        responses: {
          '200': {
            description: 'Asset status distribution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    operational: { type: 'integer' },
                    maintenance: { type: 'integer' },
                    offline: { type: 'integer' },
                    error: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/analytics/work-orders': {
      get: {
        summary: 'Get work order statistics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'startDate',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for date range'
          },
          {
            in: 'query',
            name: 'endDate',
            schema: { type: 'string', format: 'date' },
            description: 'End date for date range'
          }
        ],
        responses: {
          '200': {
            description: 'Work order statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalCount: { type: 'integer' },
                    byStatus: {
                      type: 'object',
                      properties: {
                        open: { type: 'integer' },
                        in_progress: { type: 'integer' },
                        completed: { type: 'integer' },
                        cancelled: { type: 'integer' }
                      }
                    },
                    byPriority: {
                      type: 'object',
                      properties: {
                        low: { type: 'integer' },
                        medium: { type: 'integer' },
                        high: { type: 'integer' },
                        critical: { type: 'integer' }
                      }
                    },
                    byType: {
                      type: 'object',
                      properties: {
                        preventive: { type: 'integer' },
                        corrective: { type: 'integer' },
                        emergency: { type: 'integer' }
                      }
                    },
                    avgCompletionTime: { type: 'number' }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/analytics/maintenance-compliance': {
      get: {
        summary: 'Get maintenance compliance metrics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'assetId',
            schema: { type: 'integer' },
            description: 'Filter by asset ID'
          }
        ],
        responses: {
          '200': {
            description: 'Maintenance compliance metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    complianceRate: { type: 'number' },
                    onTimeCompletions: { type: 'integer' },
                    overdueCompletions: { type: 'integer' },
                    missedMaintenances: { type: 'integer' },
                    upcomingMaintenances: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    }
  }
};

export const apis = ['./server/routes.ts'];
