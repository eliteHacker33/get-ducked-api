# Get Ducked API - Agent Context

## Project Overview

A Fastify-based REST API for managing QR codes and their associated content. This is a learning platform where code understanding is prioritized over speed.

### Purpose

Admin users create QR codes that are printed/embedded on physical objects for sale. Regular users scan these QR codes to attach or view content.

### User Flow

1. **Admin**: Creates QR codes via API
2. **First Scanner**: Scans QR code → uploads photo/video + text → QR code becomes read-only
3. **Subsequent Scanners**: Can scan but cannot modify; only the first scanner after data upload (besides the owner) can view the content

### Key Business Rules

- **One-to-one relationship**: Each QR code has one owner (the first scanner who uploads data)
- **Read-only after upload**: Once data is attached, the QR code cannot be modified
- **Exclusive viewing**: Only the first person to scan after data upload (besides the owner) can view content
- **Authentication required**: Users must have an account to scan QR codes
- **Typical use case**: Purchaser scans QR code and attaches their content

### API Role

This API supports a future mobile/web application. It handles QR code creation (admin) and content management (scanning/uploading/viewing).

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Fastify v5.6.2
- **Database**: MongoDB v7.0.0 via `@fastify/mongodb`
- **QR Code Generation**: `qrcode` library
- **Environment**: `dotenv` for environment variables

## Architecture

### Project Structure

```
get-ducked-api/
├── index.js                 # Main application entry point
├── routes/
│   └── qrCode/
│       └── index.js        # QR code route handlers
├── .cursor/
│   └── rules/              # Cursor-specific rules and patterns
├── docker-compose.yml       # MongoDB container setup
└── package.json            # Dependencies and scripts
```

### Key Patterns

- **Plugin-based routes**: Routes are organized as Fastify plugins
- **ES Modules**: Uses `import/export` syntax throughout
- **MongoDB collections**: Accessed via `fastify.mongo.db.collection()`
- **Async/await**: All route handlers are async functions

## Development Environment

- MongoDB runs via Docker Compose on port 27017
- API server runs on port 3000
- Environment variables loaded from `.env` file

## Key Conventions

### Route Organization

- Routes organized by resource in `routes/` directory
- Each resource exports a default async function (Fastify plugin)
- Routes registered with prefixes in main file

### API Design

- RESTful endpoints
- Consistent error responses with status codes
- JSON request/response format

### Error Handling

- Always handle database errors
- Return appropriate HTTP status codes
- Log errors with context
- Don't expose internal error details to clients

## Learning Focus

This project emphasizes understanding:

- All generated code should be explained
- Questions are encouraged
- Code should be verified as understood before proceeding
- Learning > Speed

## Detailed Rules

For detailed coding standards and patterns, see:

- `.cursor/rules/project-overview.mdc` - Project context
- `.cursor/rules/fastify-patterns.mdc` - Fastify conventions
- `.cursor/rules/mongodb-patterns.mdc` - Database patterns
- `.cursor/rules/api-conventions.mdc` - API design
- `.cursor/rules/error-handling.mdc` - Error handling
- `.cursor/rules/learning-notes.mdc` - Learning guidance

## Common Tasks

### Adding a New Route

1. Create route file in `routes/[resource]/index.js`
2. Export default async function that registers routes
3. Register plugin in `index.js` with appropriate prefix
4. Access MongoDB collections via `fastify.mongo.db.collection()`

### Database Operations

- Use `findOne()` for single document lookups
- Use `insertOne()` for creating documents
- Use `updateOne()` for updates
- Always handle errors and check for null results

### Error Responses

Return consistent error format:

```javascript
{
  error: "Human-readable message",
  code: "ERROR_CODE"
}
```

## Questions?

When generating code, always:

- Explain why patterns are chosen
- Include comments for complex logic
- Handle errors appropriately
- Follow established conventions
