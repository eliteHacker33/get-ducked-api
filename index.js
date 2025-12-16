// Import the framework and instantiate it
import Fastify from "fastify";

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  const { config } = await import("dotenv");
  config();
}
const fastify = Fastify({
  logger: true,
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
