import bcrypt from 'bcrypt';

export default async (fastify, opts) => {
  const usersCollection = fastify.mongo.db.collection('users');

  // Create unique index on email to prevent duplicate accounts
  // This ensures email uniqueness at the database level
  await usersCollection.createIndex({ email: 1 }, { unique: true });

  fastify.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        description: 'Register a new user account',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Successful registration',
            properties: {
              token: {
                type: 'string',
                description: 'JWT authentication token',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            description: 'Validation error',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              field: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            description: 'Email already exists',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
    const { email, password } = request.body;

    // Validate required fields
    if (!email) {
      return reply.code(400).send({
        error: 'Missing required field: email',
        code: 'VALIDATION_ERROR',
        field: 'email',
      });
    }

    if (!password) {
      return reply.code(400).send({
        error: 'Missing required field: password',
        code: 'VALIDATION_ERROR',
        field: 'password',
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR',
        field: 'email',
      });
    }

    // Basic password validation (minimum length)
    if (password.length < 8) {
      return reply.code(400).send({
        error: 'Password must be at least 8 characters long',
        code: 'VALIDATION_ERROR',
        field: 'password',
      });
    }

    try {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return reply.code(409).send({
          error: 'An account with this email already exists',
          code: 'DUPLICATE_EMAIL',
        });
      }

      // Hash the password before storing
      // bcrypt.hash() generates a salt automatically and includes it in the hash
      const saltRounds = 10; // Number of rounds (higher = more secure but slower)
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create new user document
      const newUser = {
        email,
        passwordHash,
        role: 'user', // Default role
        createdAt: new Date(),
      };

      // Insert user into database
      const result = await usersCollection.insertOne(newUser);

      // Generate JWT token for the newly created user
      const token = fastify.jwt.sign({
        userId: result.insertedId.toString(),
        email: newUser.email,
        role: newUser.role,
      });

      // Return token and user info (201 Created status for successful creation)
      return reply.code(201).send({
        token,
        user: {
          id: result.insertedId.toString(),
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      // Handle duplicate key error (unique index violation)
      // This can happen if two requests try to create the same email simultaneously
      if (error.code === 11000) {
        return reply.code(409).send({
          error: 'An account with this email already exists',
          code: 'DUPLICATE_EMAIL',
        });
      }

      fastify.log.error('Registration error', {
        error: error.message,
        stack: error.stack,
        email,
      });

      return reply.code(500).send({
        error: 'Failed to create account',
        code: 'REGISTRATION_ERROR',
      });
    }
  });

  fastify.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        description: 'Login with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Successful login',
            properties: {
              token: {
                type: 'string',
                description: 'JWT authentication token',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            description: 'Validation error',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              field: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            description: 'Invalid credentials',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
    const { email, password } = request.body;

    // Validate required fields
    if (!email) {
      return reply.code(400).send({
        error: 'Missing required field: email',
        code: 'VALIDATION_ERROR',
        field: 'email',
      });
    }

    if (!password) {
      return reply.code(400).send({
        error: 'Missing required field: password',
        code: 'VALIDATION_ERROR',
        field: 'password',
      });
    }

    try {
      // Find user by email
      const user = await usersCollection.findOne({ email });

      if (!user) {
        return reply.code(401).send({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Compare password with stored hash
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return reply.code(401).send({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user._id.toString(),
        email: user.email,
        role: user.role || 'user',
      });

      return {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role || 'user',
        },
      };
    } catch (error) {
      fastify.log.error('Login error', {
        error: error.message,
        stack: error.stack,
        email,
      });

      return reply.code(500).send({
        error: 'Failed to process login',
        code: 'LOGIN_ERROR',
      });
    }
  });
};
