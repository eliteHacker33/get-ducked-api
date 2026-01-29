import { randomUUID } from 'crypto';
import QrCode from 'qrcode';

export default async (fastify, opts) => {
  // index for later
  const qrCodesCollection = fastify.mongo.db.collection('qrCodes');

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
