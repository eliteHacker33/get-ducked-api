import bcrypt from 'bcrypt';

export default async function register(req, reply) {
  const { email, password } = req.body;
  const usersCollection = req.server.mongo.db.collection('users');

  try {
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return reply.code(409).send({
        error: 'An account with this email already exists',
        code: 'DUPLICATE_EMAIL',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    const token = req.server.jwt.sign({
      userId: result.insertedId.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return reply.code(201).send({
      token,
      user: {
        id: result.insertedId.toString(),
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return reply.code(409).send({
        error: 'An account with this email already exists',
        code: 'DUPLICATE_EMAIL',
      });
    }

    req.server.log.error('Registration error', {
      error: error.message,
      stack: error.stack,
      email,
    });

    return reply.code(500).send({
      error: 'Failed to create account',
      code: 'REGISTRATION_ERROR',
    });
  }
}
