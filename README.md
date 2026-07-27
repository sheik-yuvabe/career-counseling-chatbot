# YuvaNext Backend

Shared backend implementation for the YuvaNext Phase A career-counseling POC.

## Stack

- Node.js 22 and TypeScript
- pnpm workspaces
- Express 5
- Supabase Auth and hosted PostgreSQL
- Zod contracts and OpenAPI
- Swagger UI for API testing
- Vitest and Supertest
- Pino, Helmet and CORS

### Shared libraries

| Purpose              | Packages                                          |
| -------------------- | ------------------------------------------------- |
| HTTP/API             | `express`, `cors`, `helmet`                       |
| Validation/contracts | `zod`, `@asteasolutions/zod-to-openapi`           |
| API testing UI       | `swagger-ui-express`                              |
| Supabase/Auth        | `@supabase/supabase-js`, `supabase` CLI           |
| PostgreSQL           | `pg` with centrally managed SQL repositories      |
| Logging              | `pino` with shared Express request middleware     |
| Tests                | `vitest`, `supertest`, `@vitest/coverage-v8`      |
| Tooling              | `typescript`, `tsx`, `tsup`, `eslint`, `prettier` |
| DBML conversion      | `@dbml/core`                                      |

## Start here

- Developers: [Colleague start guide](docs/COLLEAGUE-START-HERE.md)
- Agents: [AGENTS.md](AGENTS.md)
- Data model: [Data-model index](docs/data-model/README.md)
- Collaboration rules: [Integration plan](docs/architecture/yuvanext-collaboration-integration-plan.md)

## Install and run

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Open:

- API health: `http://localhost:3000/api/v1/health`
- OpenAPI JSON: `http://localhost:3000/openapi.json`
- Swagger API testing UI: `http://localhost:3000/docs`

Hosted Supabase variables must be filled in `.env` before database-backed endpoints are used.
Docker is not required for this agreed hosted-development workflow.

## Validation

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Database workflow

Schema changes are migration-first:

```powershell
pnpm db:login
pnpm db:link
pnpm db:push
pnpm db:lint
pnpm db:types
pnpm db:validate-migration
```

Only the integration owner links and pushes the shared hosted development database. Colleagues commit migrations and open pull requests; they do not create production schema manually in the Supabase dashboard.

The baseline migration creates the 69 Phase A project-owned tables across the six module schemas. Supabase-managed `auth.users` is referenced but never recreated.
