if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  const { config } = await import("dotenv");
  config();
}
import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.register(import("@fastify/mongodb"), {
  forceClose: true,
  url: process.env.MONGODB_URI,
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  return { hello: "world" };
});

await fastify.register(import("./routes/qrCode/index.js"), {
  prefix: "/qrCode",
});

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
