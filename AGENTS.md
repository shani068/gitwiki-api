# GitWiki API

Express 4 + TypeScript API for GitWiki: Better Auth sessions, Inngest jobs that index GitHub repos into Pinecone, and RAG answers over them (LangChain + OpenAI). The web client is the sibling repo `../git-wiki-frontend`. Setup, scripts and endpoints are in [README.md](README.md).

## Tooling

- Bun is the runtime and package manager: `bun add`, `bunx`. Never npm/npx.
- Verify changes with `bunx tsc --noEmit` and `bun run lint`. There is no test suite.
- Inngest functions only run locally with the Dev Server: `bunx inngest-cli@latest dev -u http://localhost:3000/api/inngest` and `INNGEST_DEV=1`.

## Skills

Before starting any task, find the skills that apply and follow them while you implement.

1. Check the installed skills in `.claude/skills/` (Claude Code) or `.agents/skills/` (other agents). Both folders hold the same skills.
2. Use the `find-skills` skill on every task to find relevant skills, including cross-cutting ones such as API security, auth and database work. Use `bunx skills`, not `npx`.
3. Ask before installing a new skill. Install it into this project (`bunx skills add <owner/repo@skill>`, without `-g`) so `.claude/`, `.agents/` and `skills-lock.json` stay in sync.

## Conventions

- Features live in `src/modules/<name>/` as `<name>.routes|handler|service|validator.ts`; mount routers in `src/routes/index.ts` under `/api/v1`.
- Services throw `ApiError`. Handlers are wrapped in `asyncHandler` (no try/catch) and reply with `new ApiResponse(status, data, message)`. The frontend depends on that envelope and on the error shape from `error.middleware.ts`.
- Read config from `env` in `src/config/env.config.ts`, not `process.env`. Add new variables to its Zod schema and to `.env.example`.
- Import with the `@/` alias (maps to `src/`) and no `.js` extensions.
- Add every Inngest function to the `functions` array in `src/inngest/index.ts`, or it is never served.

## Invariants

- The Better Auth handler (`/api/auth/*`) must stay mounted before `express.json()` in `src/app.ts`.
- Better Auth owns the user/session/account/verification models. Generate their schema with `bunx @better-auth/cli generate` instead of hand-editing.
- Prisma is v5 (`prisma-client-js`, datasource URL in `schema.prisma`). The Prisma skill targets v7: ignore its `prisma.config.ts` and driver-adapter setup.
