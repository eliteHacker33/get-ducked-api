import Fastify from 'fastify';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import bcrypt from 'bcrypt';

describe('Login Routes', () => {
  let fastify;
  let sandbox;
  let usersCollection;
  let findOneStub;
  let insertOneStub;
  let createIndexStub;
  let bcryptHashStub;
  let bcryptCompareStub;
  let jwtSignStub;
  let logErrorStub;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Create Fastify instance
    fastify = Fastify({
      logger: false, // Disable logging in tests
    });

    // Mock MongoDB collection
    usersCollection = {
      findOne: sandbox.stub(),
      insertOne: sandbox.stub(),
      createIndex: sandbox.stub().resolves(),
    };

    // Mock MongoDB database
    const mockDb = {
      collection: sandbox.stub().returns(usersCollection),
    };

    // Mock MongoDB plugin
    fastify.decorate('mongo', {
      db: mockDb,
    });

    // Mock JWT plugin
    jwtSignStub = sandbox.stub().returns('mock-jwt-token');
    fastify.decorate('jwt', {
      sign: jwtSignStub,
    });

    // Stub bcrypt methods
    bcryptHashStub = sandbox.stub(bcrypt, 'hash');
    bcryptCompareStub = sandbox.stub(bcrypt, 'compare');

    // Register the login routes plugin
    await fastify.register(import('../../../src/routes/login/index.js'), {
      prefix: '/auth',
    });

    await fastify.ready();

    // Stub the logger after Fastify is ready (Fastify already has a log decorator)
    logErrorStub = sandbox.stub(fastify.log, 'error');
  });

  afterEach(async () => {
    sandbox.restore();
    await fastify.close();
  });

  describe('POST /auth/register', () => {
    it('should return 400 when email is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          password: 'password123',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Missing required field: email');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'email');
    });

    it('should return 400 when password is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Missing required field: password');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'password');
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Invalid email format');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'email');
    });

    it('should return 400 when password is too short', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Password must be at least 8 characters long');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'password');
    });

    it('should return 409 when user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      // Mock existing user found
      findOneStub = usersCollection.findOne.resolves({
        _id: 'existing-user-id',
        email,
        passwordHash: 'hashed-password',
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'An account with this email already exists');
      assert.equal(body.code, 'DUPLICATE_EMAIL');
      assert.isTrue(usersCollection.findOne.calledOnce);
      assert.isTrue(usersCollection.findOne.calledWith({ email }));
    });

    it('should successfully register a new user', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const userId = 'new-user-id';
      const hashedPassword = 'hashed-password-123';

      // Mock no existing user
      usersCollection.findOne.resolves(null);

      // Mock password hashing
      bcryptHashStub.resolves(hashedPassword);

      // Mock user insertion
      usersCollection.insertOne.resolves({
        insertedId: userId,
      });

      // Mock JWT token generation
      jwtSignStub.returns('mock-jwt-token');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.property(body, 'token');
      assert.property(body, 'user');
      assert.equal(body.token, 'mock-jwt-token');
      assert.equal(body.user.email, email);
      assert.equal(body.user.role, 'user');
      assert.equal(body.user.id, userId);

      // Verify bcrypt.hash was called with correct parameters
      assert.isTrue(bcryptHashStub.calledOnce);
      assert.isTrue(bcryptHashStub.calledWith(password, 10));

      // Verify user was inserted with correct data
      assert.isTrue(usersCollection.insertOne.calledOnce);
      const insertedUser = usersCollection.insertOne.firstCall.args[0];
      assert.equal(insertedUser.email, email);
      assert.equal(insertedUser.passwordHash, hashedPassword);
      assert.equal(insertedUser.role, 'user');
      assert.property(insertedUser, 'createdAt');

      // Verify JWT was signed with correct payload
      assert.isTrue(jwtSignStub.calledOnce);
      const jwtPayload = jwtSignStub.firstCall.args[0];
      assert.equal(jwtPayload.userId, userId);
      assert.equal(jwtPayload.email, email);
      assert.equal(jwtPayload.role, 'user');
    });

    it('should return 409 when MongoDB duplicate key error occurs', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Mock no existing user found initially
      usersCollection.findOne.resolves(null);

      // Mock password hashing
      bcryptHashStub.resolves('hashed-password');

      // Mock duplicate key error (MongoDB error code 11000)
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      usersCollection.insertOne.rejects(duplicateError);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 409);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'An account with this email already exists');
      assert.equal(body.code, 'DUPLICATE_EMAIL');
    });

    it('should return 500 when database error occurs', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Mock no existing user found
      usersCollection.findOne.resolves(null);

      // Mock password hashing
      bcryptHashStub.resolves('hashed-password');

      // Mock database error
      const dbError = new Error('Database connection failed');
      usersCollection.insertOne.rejects(dbError);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Failed to create account');
      assert.equal(body.code, 'REGISTRATION_ERROR');

      // Verify error was logged
      assert.isTrue(logErrorStub.calledOnce);
      const logCall = logErrorStub.firstCall.args;
      assert.equal(logCall[0], 'Registration error');
      assert.property(logCall[1], 'error');
      assert.property(logCall[1], 'stack');
      assert.equal(logCall[1].email, email);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 400 when email is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          password: 'password123',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Missing required field: email');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'email');
    });

    it('should return 400 when password is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Missing required field: password');
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.equal(body.field, 'password');
    });

    it('should return 401 when user is not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      // Mock user not found
      usersCollection.findOne.resolves(null);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Invalid email or password');
      assert.equal(body.code, 'INVALID_CREDENTIALS');

      assert.isTrue(usersCollection.findOne.calledOnce);
      assert.isTrue(usersCollection.findOne.calledWith({ email }));
    });

    it('should return 401 when password is incorrect', async () => {
      const email = 'user@example.com';
      const password = 'wrong-password';
      const userId = 'user-id-123';
      const correctPasswordHash = 'correct-hashed-password';

      // Mock user found
      usersCollection.findOne.resolves({
        _id: userId,
        email,
        passwordHash: correctPasswordHash,
        role: 'user',
      });

      // Mock password comparison fails
      bcryptCompareStub.resolves(false);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Invalid email or password');
      assert.equal(body.code, 'INVALID_CREDENTIALS');

      // Verify bcrypt.compare was called with correct parameters
      assert.isTrue(bcryptCompareStub.calledOnce);
      assert.isTrue(bcryptCompareStub.calledWith(password, correctPasswordHash));
    });

    it('should successfully login with valid credentials', async () => {
      const email = 'user@example.com';
      const password = 'correct-password';
      const userId = 'user-id-123';
      const passwordHash = 'hashed-password';

      // Mock user found
      usersCollection.findOne.resolves({
        _id: userId,
        email,
        passwordHash,
        role: 'user',
      });

      // Mock password comparison succeeds
      bcryptCompareStub.resolves(true);

      // Mock JWT token generation
      jwtSignStub.returns('mock-jwt-token');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.property(body, 'token');
      assert.property(body, 'user');
      assert.equal(body.token, 'mock-jwt-token');
      assert.equal(body.user.id, userId);
      assert.equal(body.user.email, email);
      assert.equal(body.user.role, 'user');

      // Verify bcrypt.compare was called
      assert.isTrue(bcryptCompareStub.calledOnce);
      assert.isTrue(bcryptCompareStub.calledWith(password, passwordHash));

      // Verify JWT was signed with correct payload
      assert.isTrue(jwtSignStub.calledOnce);
      const jwtPayload = jwtSignStub.firstCall.args[0];
      assert.equal(jwtPayload.userId, userId);
      assert.equal(jwtPayload.email, email);
      assert.equal(jwtPayload.role, 'user');
    });

    it('should use default role "user" when role is not set', async () => {
      const email = 'user@example.com';
      const password = 'correct-password';
      const userId = 'user-id-123';
      const passwordHash = 'hashed-password';

      // Mock user found without role field
      usersCollection.findOne.resolves({
        _id: userId,
        email,
        passwordHash,
      });

      // Mock password comparison succeeds
      bcryptCompareStub.resolves(true);

      // Mock JWT token generation
      jwtSignStub.returns('mock-jwt-token');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.equal(body.user.role, 'user');

      // Verify JWT payload uses default role
      const jwtPayload = jwtSignStub.firstCall.args[0];
      assert.equal(jwtPayload.role, 'user');
    });

    it('should return 500 when database error occurs', async () => {
      const email = 'user@example.com';
      const password = 'password123';

      // Mock database error
      const dbError = new Error('Database connection failed');
      usersCollection.findOne.rejects(dbError);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email,
          password,
        },
      });

      assert.equal(response.statusCode, 500);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Failed to process login');
      assert.equal(body.code, 'LOGIN_ERROR');

      // Verify error was logged
      assert.isTrue(logErrorStub.calledOnce);
      const logCall = logErrorStub.firstCall.args;
      assert.equal(logCall[0], 'Login error');
      assert.property(logCall[1], 'error');
      assert.property(logCall[1], 'stack');
      assert.equal(logCall[1].email, email);
    });
  });
});
