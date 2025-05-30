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
};

export const apis = ['./server/routes.ts'];
