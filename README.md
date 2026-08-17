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

The default development fixture runtime accepts `Bearer fixture-token` in Swagger and keeps
synthetic counselor state in memory. It is rejected when `NODE_ENV=production`.

Module 4 fixture endpoints:

- `POST /api/v1/conversations`
- `GET /api/v1/conversations/:conversationId/messages`
- `POST /api/v1/conversations/:conversationId/messages`
- `GET /api/v1/journey`
- `POST /api/v1/journey/events`
- `POST /api/v1/exploration/events`
- `POST /api/v1/reports`
- `GET /api/v1/reports/:reportId`
- `POST /api/v1/reports/:reportId/pdf`
- `POST /api/v1/share-cards`

Hosted Supabase variables must be filled in `.env` before database-backed endpoints are used.
Docker is not required for this agreed hosted-development workflow.

Integrated Module 4 supports Gemini and Anthropic AI adapters, a Module 5 safety HTTP adapter,
and Supabase Storage report rendering. Select the provider with `AI_PROVIDER`. Gemini requires
both `GEMINI_API_KEY` and `GEMINI_MODEL`; Anthropic requires both corresponding `ANTHROPIC_*`
values. Missing provider configuration degrades to approved copy. Module 3 knowledge remains
required for entity-grounded answers. Configure the server-side variables and
`SAFETY_SERVICE_URL` shown in `.env.example`; never expose provider credentials to a browser
client.

For Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=<Google AI Studio server-side key>
GEMINI_MODEL=gemini-3.6-flash
GEMINI_MAX_TOKENS=700
GEMINI_TIMEOUT_MS=15000
GEMINI_THINKING_LEVEL=minimal
```

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
