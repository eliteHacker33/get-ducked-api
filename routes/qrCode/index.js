export default async (fastify, opts) => {
  // Register your route files here
  fastify.get('/', async (request, reply) => {
    return { message: 'QR Code endpoint' };
  });
};
