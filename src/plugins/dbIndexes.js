export default async function dbIndexesPlugin(fastify) {
  const db = fastify.mongo.db;

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('qrCodes').createIndex({ id: 1 }, { unique: true });
}
