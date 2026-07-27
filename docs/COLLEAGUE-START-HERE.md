# Colleague Start Guide

## One-time setup

```powershell
git clone <repository-url>
cd career-counseling-chatbot
Copy-Item .env.example .env
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

Use `http://localhost:3000/docs` to inspect and test every API. Do not create another Swagger/Postman server inside a module.

The shared hosted Supabase database and baseline tables are integration-owned. Module developers consume the committed schema and generated database types; they do not independently recreate the tables or need Docker for the agreed workflow.

## Pick your module

| Module              | Work path                                | Read these first                                                                                                                                                                                     |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Assessment        | `packages/assessment`                    | `docs/poc/module-1-user-profile-assessment.md`, `docs/data-model/module-1-assessment-data-model.md`, `module-1-assessment-mvp.dbml`, `module-1-prototype-storage-flow.md`                            |
| 2 Recommendations   | `packages/recommendations`               | `docs/poc/module-2-recommendation-planning.md`, `docs/data-model/module-2-recommendation-data-model.md`, `module-2-recommendation-mvp.dbml`, `module-2-recommendation-storage-flow.md`               |
| 3 Knowledge         | `packages/knowledge`                     | `docs/poc/module-3-grounded-knowledge.md`, `docs/data-model/module-3-knowledge-data-model.md`, `module-3-knowledge-mvp.dbml`, `module-3-knowledge-storage-flow.md`                                   |
| 4 Counselor         | `packages/counselor`                     | `docs/poc/module-4-ai-counselor-experience.md`, `docs/data-model/module-4-counselor-data-model.md`, `module-4-counselor-mvp.dbml`, `module-4-counselor-storage-flow.md`                              |
| 5 Safety/Evaluation | `packages/safety`, `packages/evaluation` | `docs/poc/module-5-safety-evaluation-operations.md`, `docs/data-model/module-5-safety-operations-data-model.md`, `module-5-safety-operations-mvp.dbml`, `module-5-safety-operations-storage-flow.md` |

All paths after the first document in each row are under `docs/data-model`.

## Working rule

Create a branch from the verified baseline and modify only your owned package plus its tests. Changes to contracts, API composition, root configuration or another module's migration require integration-owner review.

Every public route must provide:

- Zod request/response schemas in `packages/contracts`;
- OpenAPI registration so it appears in `/docs`;
- service/use-case logic outside the route handler;
- repository isolation for database queries;
- success, validation, authorization and idempotency tests as applicable.

Never commit secrets or real user data.
