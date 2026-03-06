export default async function getQrCodeById(req, reply) {
  const { id } = req.params;
  const qrCodesCollection = req.server.mongo.db.collection('qrCodes');
  const qrCode = await qrCodesCollection.findOne({ id });

  if (!qrCode) {
    return reply.code(404).send({
      error: 'QR code not found',
      code: 'NOT_FOUND',
    });
  }

  return qrCode;
}
