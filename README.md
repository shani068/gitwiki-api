# GitWiki API

The backend server for **GitWiki**, a tool that turns a GitHub repository into a searchable wiki you can ask questions about.

This service handles user accounts and sign-in, runs background jobs, and provides the HTTP API used by the web app ([gitwiki-web](https://github.com/shani068/gitwiki-web)).

---

## Table of Contents

- [What It Does](#what-it-does)
- [Project Status](#project-status)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Response Format](#response-format)
- [Development Workflow](#development-workflow)
- [Logging](#logging)
- [License](#license)

---

## What It Does

In plain terms, GitWiki API:

1. **Manages accounts.** People sign up and sign in with an email and password.
2. **Reads code from GitHub.** A background job downloads a repository's source files.
3. **Makes the code searchable.** Files are split into small pieces and stored as vector embeddings, a numeric form that lets the service find text by meaning rather than exact words.
4. **Answers questions.** Given a question about a repository, it finds the most relevant pieces of code and asks an AI model to answer using only those pieces.

---

## Project Status

The project is in active development. Some parts are connected and running; others are written but not yet connected to the running server.

| Area | Status |
| --- | --- |
| Server, security headers, CORS, request logging | ✅ Working |
| Sign-up / sign-in (Better Auth, `/api/auth/*`) | ✅ Mounted (needs database tables, see [setup](#getting-started)) |
| User profile (`/api/v1/users/me`) | ✅ Working |
| Health check, API docs | ✅ Working |
| Inngest endpoint (`/api/inngest`) | ✅ Working, serves the `hello-world` test job only |
| Repository indexing job (`indexRepo`) | 🚧 Written, not registered in `src/inngest/index.ts` |
| Question answering job (`askQuestionFn`) | 🚧 Written, not registered in `src/inngest/index.ts` |
| Index request route (`src/routes/post.routes.ts`) | 🚧 Written, not mounted |
| Redis caching (`src/utils/cache.ts`) | 🚧 Client in `redis.config.ts` is commented out |
| Rate limiting (`rateLimiter.middleware.ts`) | 🚧 Defined, not applied to any route |
| Wiki endpoints used by the frontend (`/api/v1/wikis`) | ❌ Not implemented yet |

---

## How It Works

```mermaid
flowchart LR
    Web[GitWiki Web app] -->|HTTP| API[GitWiki API<br/>Express]
    API --> Auth[Better Auth]
    Auth --> DB[(PostgreSQL<br/>via Prisma)]
    API -->|sends events| Inngest[Inngest<br/>background jobs]
    Inngest -->|fetch files| GitHub[GitHub API]
    Inngest -->|embeddings + answers| OpenAI[OpenAI]
    Inngest -->|store & search chunks| Pinecone[(Pinecone)]
```

**Indexing pipeline** (`src/inngest/functions/indexRepo.ts`, triggered by the `repo/index.requested` event):

1. **Fetch.** Reads the file tree of the repository's default branch through the GitHub API. Skips folders like `node_modules`, `dist` and `.git`, binary and media files, lock files, and files over a size limit. Stops after 200 files.
2. **Chunk.** Splits each file into pieces of about 1,000 characters with a 150-character overlap.
3. **Store.** Saves the pieces to a Pinecone index. Embeddings use OpenAI's `text-embedding-3-small` model.

**Question answering** (`src/inngest/functions/askQuestions.ts`, triggered by the `chat/question.requested` event):

1. Finds the 5 stored pieces closest to the question.
2. Sends them to OpenAI's `gpt-4o-mini` with an instruction to answer from that context only.
3. Returns the answer and the list of source file paths.

Each step runs as an Inngest step, so a failed step can be retried without repeating the ones that succeeded.

---

## Tech Stack

| Technology | Purpose |
| --- | --- |
| [Bun](https://bun.sh) | Runtime and package manager |
| [Express 4](https://expressjs.com) | HTTP server and routing |
| TypeScript | Type safety |
| [Prisma 5](https://www.prisma.io) + PostgreSQL | Database access and migrations |
| [Better Auth](https://www.better-auth.com) | Email/password authentication and sessions |
| [Inngest](https://www.inngest.com) | Durable background jobs |
| [LangChain](https://js.langchain.com) + OpenAI | Text splitting, embeddings, and AI answers |
| [Pinecone](https://www.pinecone.io) | Vector database for code chunks |
| Octokit | GitHub API client |
| Zod | Environment and request validation |
| Winston | Logging, with daily log rotation in production |
| Scalar + swagger-jsdoc | Interactive API documentation |
| Helmet, CORS, express-rate-limit | HTTP security |
| ioredis | Redis client for caching (currently disabled) |
| ESLint + Prettier | Linting and formatting |

---

## Project Structure

```
git-wiki-backend/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── server.ts              # Entry point: starts the HTTP server
│   ├── app.ts                 # Express app: middleware, routes, docs, error handler
│   ├── config/
│   │   ├── env.config.ts      # Loads and validates environment variables (Zod)
│   │   ├── auth.config.ts     # Better Auth setup
│   │   ├── database.config.ts # Prisma client
│   │   ├── logger.config.ts   # Winston logger
│   │   ├── swagger.config.ts  # OpenAPI spec and Scalar docs at /docs
│   │   ├── redis.config.ts    # Redis client (commented out)
│   │   └── app.config.ts      # Rate-limit and pagination settings
│   ├── modules/               # Feature modules: routes → handler → service
│   │   ├── auth/              # Legacy JWT auth (commented out; Better Auth replaces it)
│   │   └── users/             # Current user's profile
│   ├── inngest/
│   │   ├── client.ts          # Inngest client
│   │   ├── index.ts           # List of functions served at /api/inngest
│   │   └── functions/         # hello, indexRepo, askQuestions
│   ├── middleware/            # auth (protect), error handler, rate limiter
│   ├── routes/                # Route registration under /api/v1
│   ├── types/                 # Express request typing and shared types
│   └── utils/                 # ApiError, ApiResponse, asyncHandler, GitHub,
│                              # chunking, vector store, RAG, cache helpers
├── .env.example               # Template for your local .env
├── AGENTS.md                  # Conventions for AI coding agents (and humans)
└── package.json
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0 or newer
- PostgreSQL, running locally or hosted
- A [Pinecone](https://www.pinecone.io) account with an index (the server will not start without Pinecone settings)
- An OpenAI API key, for the indexing and question-answering pipeline

### 1. Install

```bash
git clone https://github.com/shani068/gitwiki-api.git
cd gitwiki-api
bun install
```

### 2. Configure

```bash
cp .env.example .env
```

Fill in the values described in [Environment Variables](#environment-variables). `.env.example` does not yet include `PINECONE_API_KEY` and `PINECONE_INDEX_NAME`; add them yourself.

### 3. Set up the database

Better Auth stores users, sessions and accounts in its own tables. Generate their Prisma models, then create the tables:

```bash
bunx @better-auth/cli generate   # adds Better Auth models to prisma/schema.prisma
bunx prisma generate             # builds the Prisma client
bunx prisma migrate dev          # creates the tables in PostgreSQL
```

### 4. Run

```bash
bun run dev
```

The server starts on `http://localhost:3000` (or the `PORT` you set). Check it is up:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### 5. Run background jobs locally (optional)

Inngest functions only run locally when the Inngest Dev Server is running. In a second terminal:

```bash
bunx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Keep `INNGEST_DEV=1` in your `.env`. The Dev Server dashboard (at `http://localhost:8288` by default) lets you send test events and watch runs.

---

## Environment Variables

All variables are validated at startup in `src/config/env.config.ts`. If a required variable is missing or invalid, the server prints the error and exits.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test`. Controls log level and format. |
| `PORT` | No | `3000` | Port the server listens on. |
| `DATABASE_URL` | No | `postgresql://postgres:postgres@localhost:5432/git_wiki` | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | Recommended | none | Secret used to sign sessions. Generate one with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Recommended | none | Public base URL of this API, e.g. `http://localhost:3000`. |
| `PINECONE_API_KEY` | **Yes** | none | Pinecone API key. |
| `PINECONE_INDEX_NAME` | **Yes** | none | Name of the Pinecone index that stores code chunks. |
| `INNGEST_DEV` | No | `1` | Set to `1` to use the local Inngest Dev Server. |
| `REDIS_URL` | No | none | Redis connection string. Not used while Redis is disabled. |
| `OPENAI_API_KEY` | For AI features | none | Read directly by LangChain for embeddings and answers. Not validated at startup. |

Example `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/git_wiki
BETTER_AUTH_SECRET=replace-with-a-random-secret
BETTER_AUTH_URL=http://localhost:3000
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=gitwiki
OPENAI_API_KEY=your-openai-key
INNGEST_DEV=1
```

> Never commit your `.env` file. It is listed in `.gitignore`.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the server with auto-reload on file changes |
| `bun run build` | Bundle the server into `dist/` |
| `bun start` | Run the bundled server from `dist/server.js` |
| `bun run lint` | Check code with ESLint |
| `bun run lint:fix` | Fix ESLint issues automatically where possible |
| `bun run format` | Format code with Prettier |
| `bun run check` | Run lint, then format |
| `bunx tsc --noEmit` | Type-check the project without building |

There is no automated test suite yet.

---

## API Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | No | Health check, returns `{ "status": "ok" }` |
| GET | `/docs` | No | Interactive API documentation (Scalar) |
| GET | `/openapi.json` | No | OpenAPI 3 specification |
| POST | `/api/auth/sign-up/email` | No | Create an account (Better Auth) |
| POST | `/api/auth/sign-in/email` | No | Sign in (Better Auth) |
| ALL | `/api/auth/*` | Varies | Other Better Auth routes, such as sign-out and session |
| GET | `/api/v1/users/me` | Yes | Get the signed-in user's profile |
| PUT | `/api/v1/users/me` | Yes | Update the signed-in user's name |
| ALL | `/api/inngest` | No | Endpoint Inngest uses to run background functions |

"Auth: Yes" routes use the `protect` middleware, which reads the Better Auth session from the request's cookies and headers and returns `401` if there is none.

The OpenAPI spec is built from JSDoc comments in `src/modules/**/*.routes.ts`. Routes only appear in `/docs` once they have `@openapi` comments.

---

## Response Format

Successful responses from `/api/v1` routes use the `ApiResponse` class:

```json
{
  "statusCode": 200,
  "data": { "id": "…", "name": "Jane", "email": "jane@example.com" },
  "message": "Success",
  "success": true
}
```

Errors are formatted by the global error handler (`src/middleware/error.middleware.ts`):

```json
{
  "success": false,
  "message": "User not found"
}
```

In development, errors also include a `stack` field. Common database errors are translated: a duplicate unique value (Prisma `P2002`) becomes `409`, and a missing record (`P2025`) becomes `404`.

The frontend relies on both shapes, so keep them stable.

---

## Development Workflow

### Adding a feature module

1. Create `src/modules/<name>/` with four files:
   - `<name>.routes.ts`: Express router
   - `<name>.handler.ts`: reads the request, calls the service, sends `new ApiResponse(status, data, message)`
   - `<name>.service.ts`: business logic and database access; throws `ApiError` on failure
   - `<name>.validator.ts`: Zod schemas for request bodies
2. Wrap handlers in `asyncHandler` so errors reach the error handler without `try/catch`.
3. Mount the router in `src/routes/index.ts` under `/api/v1`.
4. Add `protect` to routes that need a signed-in user.

### Adding a background job

1. Create the function in `src/inngest/functions/`.
2. Add it to the `functions` array in `src/inngest/index.ts`. Unregistered functions never run.
3. Trigger it with `inngest.send({ name: "<event>", data: { … } })`.

### Conventions

- Read configuration from `env` (`src/config/env.config.ts`), not `process.env`. When you add a variable, add it to the Zod schema and to `.env.example`.
- Import with the `@/` alias (maps to `src/`).
- Keep the Better Auth handler (`/api/auth/*`) mounted **before** `express.json()` in `src/app.ts`, or auth requests will break.
- Don't hand-edit Better Auth's database models; regenerate them with `bunx @better-auth/cli generate`.
- Before committing, run `bunx tsc --noEmit` and `bun run lint`.

See [AGENTS.md](AGENTS.md) for the full list of conventions.

---

## Logging

Logging uses Winston (`src/config/logger.config.ts`). Every HTTP request is logged with its method, URL, status code and duration.

| Environment | Level | Output |
| --- | --- | --- |
| `development` | `debug` | Colorized, human-readable console output |
| `test` | `warn` | Console |
| `production` | `http` | JSON console output, plus rotating files in `logs/`: `combined-*.log` (kept 14 days) and `error-*.log` (kept 30 days) |

---

## License

MIT
