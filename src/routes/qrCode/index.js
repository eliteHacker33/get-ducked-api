import { randomUUID } from 'crypto';
import QrCode from 'qrcode';

export default async (fastify, opts) => {
  const qrCodesCollection = fastify.mongo.db.collection('qrCodes');

  // Create unique index on id field for fast lookups and to prevent duplicates
  // This ensures id uniqueness at the database level and speeds up queries
  await qrCodesCollection.createIndex({ id: 1 }, { unique: true });

  // Register your route files here
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['qrCode'],
        description: 'Get QR code by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'QR code unique identifier',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'QR code information',
            properties: {
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            description: 'QR code not found',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
    const { id } = request.params;
    const user = await qrCodesCollection.findOne({ id: id });
    return { message: 'QR Code endpoint' };
  });

  fastify.post(
    '/generate',
    {
      schema: {
        tags: ['qrCode'],
        description: 'Generate a new QR code',
        response: {
          201: {
            type: 'object',
            description: 'QR code generated successfully',
            properties: {
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            description: 'Server error',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
    // Logic to generate a QR code
    const id = randomUUID();

    const qrCodeShell = { id, createdAt: new Date() };
    const user = await qrCodesCollection.insertOne(qrCodeShell);
    return { message: 'QR Code generated' };
  });
};
