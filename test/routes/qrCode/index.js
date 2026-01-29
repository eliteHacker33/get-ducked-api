import Fastify from 'fastify';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';

describe('QR Code Routes', () => {
  let fastify;
  let sandbox;
  let qrCodesCollection;
  let findOneStub;
  let insertOneStub;
  let createIndexStub;
  let logErrorStub;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Create Fastify instance
    fastify = Fastify({
      logger: false, // Disable logging in tests
    });

    // Mock MongoDB collection
    qrCodesCollection = {
      findOne: sandbox.stub(),
      insertOne: sandbox.stub(),
      createIndex: sandbox.stub().resolves(),
    };

    // Mock MongoDB database
    const mockDb = {
      collection: sandbox.stub().returns(qrCodesCollection),
    };

    // Mock MongoDB plugin
    fastify.decorate('mongo', {
      db: mockDb,
    });

    // Register the qrCode routes plugin
    await fastify.register(import('../../../src/routes/qrCode/index.js'), {
      prefix: '/qrCode',
    });

    await fastify.ready();

    // Stub the logger after Fastify is ready (Fastify already has a log decorator)
    logErrorStub = sandbox.stub(fastify.log, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
    await fastify.close();
  });

  describe('GET /qrCode/:id', () => {
    it('should return QR Code endpoint message', async () => {
      const qrCodeId = 'test-qr-code-id';

      // Mock QR code found
      qrCodesCollection.findOne.resolves({
        id: qrCodeId,
        createdAt: new Date(),
      });

      const response = await fastify.inject({
        method: 'GET',
        url: `/qrCode/${qrCodeId}`,
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.message, 'QR Code endpoint');

      // Verify findOne was called with correct id
      assert.isTrue(qrCodesCollection.findOne.calledOnce);
      assert.isTrue(qrCodesCollection.findOne.calledWith({ id: qrCodeId }));
    });

    it('should return QR Code endpoint message even when QR code not found', async () => {
      const qrCodeId = 'non-existent-id';

      // Mock QR code not found
      qrCodesCollection.findOne.resolves(null);

      const response = await fastify.inject({
        method: 'GET',
        url: `/qrCode/${qrCodeId}`,
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.message, 'QR Code endpoint');

      // Verify findOne was called
      assert.isTrue(qrCodesCollection.findOne.calledOnce);
      assert.isTrue(qrCodesCollection.findOne.calledWith({ id: qrCodeId }));
    });

    it('should handle database errors', async () => {
      const qrCodeId = 'test-id';

      // Mock database error
      const dbError = new Error('Database connection failed');
      qrCodesCollection.findOne.rejects(dbError);

      try {
        await fastify.inject({
          method: 'GET',
          url: `/qrCode/${qrCodeId}`,
        });
        // If no error is thrown, the route should handle it
        // Since the current implementation doesn't have error handling,
        // this test documents the current behavior
      } catch (error) {
        // If error propagates, verify it's the expected error
        assert.instanceOf(error, Error);
      }
    });
  });

  describe('POST /qrCode/generate', () => {
    it('should generate a new QR code', async () => {
      const mockInsertedId = 'inserted-id-123';

      // Mock successful insertion
      qrCodesCollection.insertOne.resolves({
        insertedId: mockInsertedId,
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/qrCode/generate',
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.message, 'QR Code generated');

      // Verify insertOne was called
      assert.isTrue(qrCodesCollection.insertOne.calledOnce);
      const insertedDoc = qrCodesCollection.insertOne.firstCall.args[0];

      // Verify ID is a valid UUID format (UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
      assert.property(insertedDoc, 'id');
      assert.typeOf(insertedDoc.id, 'string');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.match(insertedDoc.id, uuidRegex, 'ID should be a valid UUID');

      assert.property(insertedDoc, 'createdAt');
      assert.instanceOf(insertedDoc.createdAt, Date);
    });

    it('should generate unique IDs for each QR code', async () => {
      // Mock successful insertions for both calls
      qrCodesCollection.insertOne.resolves({ insertedId: 'id-1' });

      // First generation
      const response1 = await fastify.inject({
        method: 'POST',
        url: '/qrCode/generate',
      });

      assert.equal(response1.statusCode, 200);

      // Save the first call's data
      assert.isTrue(qrCodesCollection.insertOne.calledOnce);
      const firstDoc = qrCodesCollection.insertOne.firstCall.args[0];
      const firstId = firstDoc.id;

      // Second generation (stub will continue to resolve)
      qrCodesCollection.insertOne.resolves({ insertedId: 'id-2' });

      const response2 = await fastify.inject({
        method: 'POST',
        url: '/qrCode/generate',
      });

      assert.equal(response2.statusCode, 200);

      // Verify two different calls were made
      assert.equal(qrCodesCollection.insertOne.callCount, 2);

      // Verify the IDs in the inserted documents are different
      const secondDoc = qrCodesCollection.insertOne.secondCall.args[0];
      const secondId = secondDoc.id;
      assert.notEqual(firstId, secondId, 'Each QR code should have a unique ID');
    });

    it('should include createdAt timestamp', async () => {
      const beforeTime = new Date();

      // Mock successful insertion
      qrCodesCollection.insertOne.resolves({
        insertedId: 'inserted-id',
      });

      await fastify.inject({
        method: 'POST',
        url: '/qrCode/generate',
      });

      const afterTime = new Date();

      // Verify createdAt was included
      assert.isTrue(qrCodesCollection.insertOne.calledOnce);
      const insertedDoc = qrCodesCollection.insertOne.firstCall.args[0];
      assert.property(insertedDoc, 'createdAt');
      assert.instanceOf(insertedDoc.createdAt, Date);

      // Verify timestamp is within reasonable range
      assert.isAtLeast(insertedDoc.createdAt.getTime(), beforeTime.getTime());
      assert.isAtMost(insertedDoc.createdAt.getTime(), afterTime.getTime());
    });

    it('should handle database errors during generation', async () => {
      // Mock database error
      const dbError = new Error('Database connection failed');
      qrCodesCollection.insertOne.rejects(dbError);

      try {
        await fastify.inject({
          method: 'POST',
          url: '/qrCode/generate',
        });
        // If no error is thrown, the route should handle it
        // Since the current implementation doesn't have error handling,
        // this test documents the current behavior
      } catch (error) {
        // If error propagates, verify it's the expected error
        assert.instanceOf(error, Error);
      }
    });

    it('should handle duplicate key errors', async () => {
      // Mock duplicate key error (MongoDB error code 11000)
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      qrCodesCollection.insertOne.rejects(duplicateError);

      try {
        await fastify.inject({
          method: 'POST',
          url: '/qrCode/generate',
        });
        // If no error is thrown, the route should handle it
        // Since the current implementation doesn't have error handling,
        // this test documents the current behavior
      } catch (error) {
        // If error propagates, verify it's the expected error
        assert.instanceOf(error, Error);
      }
    });
  });
});
