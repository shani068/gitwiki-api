# GitWiki API

Backend API for GitWiki. It authenticates users and powers the service that turns a Git repository into a living, searchable wiki.

This repository is the server for GitWiki: sign-in, user accounts, background jobs, and the HTTP API the app calls.

## Stack

| Technology  | Purpose                       |
| ----------- | ----------------------------- |
| Express.js  | HTTP framework                |
| TypeScript  | Type safety                   |
| Prisma      | ORM + migrations              |
| PostgreSQL  | Database                      |
| Better Auth | Authentication                |
| Inngest     | Background jobs               |
| ioredis     | Caching                       |
| Zod         | Validation                    |
| Winston     | Logging                       |
| Scalar UI   | API documentation             |
| Helmet      | HTTP security headers         |
| CORS        | Cross-origin resource sharing |

## Features

- Module-based folder structure
- Better Auth — email/password and session management
- Zod validation on endpoints
- Redis caching with type-safe key helpers
- Inngest for durable background work
- Winston structured logging (development and production)
- Scalar API docs at `/docs`
- Global error handler with Prisma error codes
- Rate limiting
- ESLint and Prettier
- `asyncHandler` so route handlers stay free of try/catch boilerplate
- Helmet and CORS security middleware

## Getting Started

```bash
git clone https://github.com/shani068/gitwiki-api
cd gitwiki-api
bun install
cp .env.example .env
# fill in the required values in .env
bunx prisma generate
bunx prisma migrate dev
bun run dev
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/git_wiki
BETTER_AUTH_SECRET=     # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
INNGEST_DEV=1
```

## Scripts

| Command            | Description                 |
| ------------------ | --------------------------- |
| `bun run dev`      | Development with hot reload |
| `bun run build`    | Compile TypeScript          |
| `bun start`        | Production server           |
| `bun run lint`     | ESLint check                |
| `bun run lint:fix` | Auto fix lint errors        |
| `bun run format`   | Prettier format             |
| `bun run check`    | Run lint and format together |

## API Endpoints

| Method | Route                   | Auth | Description          |
| ------ | ----------------------- | ---- | -------------------- |
| GET    | /health                 | No   | Health check         |
| GET    | /docs                   | No   | Scalar API UI        |
| GET    | /openapi.json           | No   | OpenAPI spec         |
| POST   | /api/auth/sign-up/email | No   | Register             |
| POST   | /api/auth/sign-in/email | No   | Login                |
| ALL    | /api/inngest            | No   | Inngest serve endpoint |
| GET    | /api/v1/users/me        | Yes  | Get profile          |
| PUT    | /api/v1/users/me        | Yes  | Update profile       |

Auth routes (`/api/auth/*`) are handled by Better Auth.

## Project Structure

```
src/
├── modules/          # Feature-based modules
│   ├── auth/         # handler, service, routes, validator (Better Auth integration)
│   └── users/        # handler, service, routes, validator
├── inngest/          # Inngest client and background functions
├── config/           # env, database, redis, auth, swagger, logger
├── middleware/       # auth, error, rateLimiter
├── routes/           # centralized route registration
├── types/            # express.d.ts, jwt.types.ts, global TypeScript types
└── utils/            # ApiError, ApiResponse, asyncHandler, cache
```

## License

MIT
