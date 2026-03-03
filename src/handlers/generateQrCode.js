import { randomUUID } from 'crypto';

export default async function generateQrCode(req, reply) {
  const qrCodesCollection = req.server.mongo.db.collection('qrCodes');
  const id = randomUUID();
  const qrCodeShell = { id, createdAt: new Date() };

  await qrCodesCollection.insertOne(qrCodeShell);

  return reply.code(201).send({ message: 'QR Code generated' });
}
