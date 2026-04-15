# Production stage - minimal image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src ./src

# Cloud Run sets PORT=8080; without PORT the app uses 3000 (see src/index.js).
EXPOSE 8080

# Set NODE_ENV for production
ENV NODE_ENV=production

# Run the application
CMD ["node", "src/index.js"]
