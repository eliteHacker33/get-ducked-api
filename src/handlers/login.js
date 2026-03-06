import bcrypt from 'bcrypt';

export default async function login(req, reply) {
  const { email, password } = req.body;
  const usersCollection = req.server.mongo.db.collection('users');

  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return reply.code(401).send({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return reply.code(401).send({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const token = req.server.jwt.sign({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
    });

    return reply.code(200).send({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    req.server.log.error('Login error', {
      error: error.message,
      stack: error.stack,
      email,
    });

    return reply.code(500).send({
      error: 'Failed to process login',
      code: 'LOGIN_ERROR',
    });
  }
}
