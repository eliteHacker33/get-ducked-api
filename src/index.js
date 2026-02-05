import Fastify from 'fastify';
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const { config } = await import('dotenv');
  config();
}

const fastify = Fastify({
  logger: true,
});

fastify.register(import('@fastify/mongodb'), {
  forceClose: true,
  url: process.env.MONGODB_URI,
});

// Register JWT plugin for authentication
//TODO - understand best practices for this secret (and all env secrets)
fastify.register(import('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
});

// Register Swagger for API documentation
fastify.register(import('@fastify/swagger'), {
  openapi: {
    info: {
      title: 'Get Ducked API',
      description: 'API for managing QR codes and their associated content',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'qrCode', description: 'QR code management endpoints' },
    ],
  },
});

// Register Swagger UI for interactive API documentation
fastify.register(import('@fastify/swagger-ui'), {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

await fastify.register(import('./routes/qrCode/index.js'), {
  prefix: '/qrCode',
});

await fastify.register(import('./routes/login/index.js'), {
  prefix: '/auth',
});

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
