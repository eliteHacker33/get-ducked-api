import { randomUUID } from 'crypto';
import QrCode from 'qrcode';

export default async (fastify, opts) => {
  const qrCodesCollection = fastify.mongo.db.collection('qrCodes');

  // Create unique index on id field for fast lookups and to prevent duplicates
  // This ensures id uniqueness at the database level and speeds up queries
  await qrCodesCollection.createIndex({ id: 1 }, { unique: true });

  // Register your route files here
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await qrCodesCollection.findOne({ id: id });
    return { message: 'QR Code endpoint' };
  });

  fastify.post('/generate', async (request, reply) => {
    // Logic to generate a QR code
    const id = randomUUID();

    const qrCodeShell = { id, createdAt: new Date() };
    const user = await qrCodesCollection.insertOne(qrCodeShell);
    return { message: 'QR Code generated' };
  });
};
