import Fastify from 'fastify';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import openapiGlue from 'fastify-openapi-glue';
import { serviceHandlers } from './handlers/index.js';

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const { config } = await import('dotenv');
  config();
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiSpecPath = join(__dirname, 'api.yaml');

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
  secret: process.env.JWT_SECRET,
});

// Create database indexes (users.email, qrCodes.id)
fastify.register(import('./plugins/dbIndexes.js'));

// Register Swagger for API documentation (static spec from api.yaml)
fastify.register(import('@fastify/swagger'), {
  mode: 'static',
  specification: {
    path: apiSpecPath,
  },
  exposeRoute: true,
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

// Validation errors from Fastify (when request doesn't match api.yaml schema) use Fastify's
// default format: { statusCode, error: 'Bad Request', message } — no custom error handler needed.
// Register routes from OpenAPI spec (api.yaml is source of truth)
fastify.register(openapiGlue, {
  specification: apiSpecPath,
  serviceHandlers,
});

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
