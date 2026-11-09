const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'GramCraft Rural Planning Platform API',
    version: '1.0.0',
    description: 'REST API Gateway for GramCraft - Data-driven rural development planning platform for India.',
    contact: {
      name: 'GramCraft Platform Team',
      email: 'tech@gramcraft.gov.in',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Gateway',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
        responses: { 200: { description: 'Service is operational' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@gramcraft.gov.in' },
                  password: { type: 'string', example: 'GramCraft@2026' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { 200: { description: 'Successful login with JWT token and user scope' } },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current authenticated user profile and scope',
        responses: { 200: { description: 'User profile details' } },
      },
    },
    '/api/villages': {
      get: {
        summary: 'Query villages with geospatial, text, and tier filters',
        parameters: [
          { name: 'district', in: 'query', schema: { type: 'string' } },
          { name: 'block', in: 'query', schema: { type: 'string' } },
          { name: 'tier', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'bbox', in: 'query', description: 'minLng,minLat,maxLng,maxLat', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of matching villages' } },
      },
    },
    '/api/villages/near': {
      get: {
        summary: 'Geospatial radius search around coordinates',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'radiusKm', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'Villages within target radius' } },
      },
    },
    '/api/villages/{id}/insights': {
      get: {
        summary: 'AI-driven score breakdown, recommendations, forecast, and peer villages',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Comprehensive village analytical insights' } },
      },
    },
    '/api/budget/optimize': {
      post: {
        summary: 'Greedy marginal-gain budget allocation with diminishing returns',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  blockId: { type: 'string', example: 'Ichhawar' },
                  total: { type: 'number', example: 5000000 },
                  lockedAllocations: { type: 'array' },
                },
                required: ['blockId', 'total'],
              },
            },
          },
        },
        responses: { 200: { description: 'Optimized budget allocation per village and sector' } },
      },
    },
    '/api/reports/village/{id}.pdf': {
      get: {
        summary: 'Generate printable PDF dossier for a village',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'PDF stream' } },
      },
    },
  },
};

function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('[Swagger] OpenAPI documentation mounted at /docs');
}

module.exports = { setupSwagger };
