# EIRMIS Mock Backend Guide

This guide explains how to run the local Stoplight Prism mock API, choose responses defined in the EIRMIS OpenAPI contract, and configure the environment for mock or live Supabase development.

## 1. How the pieces fit together

- **OpenAPI contract:** `contract/openapi.yaml` is the API contract. It references operation definitions under `contract/paths/` and schemas under `contract/components/`.
- **Prism:** reads that contract and serves example or schema-generated HTTP responses locally. It is useful for developing and testing API requests without calling the live Supabase project.
- **Vite:** serves the web frontend locally at `http://127.0.0.1:5173`.
- **Supabase:** provides the live or local backend services. The contract lists the hosted Supabase URL pattern and local Supabase at `http://127.0.0.1:54321` as server targets.

Prism is a mock server, not a database. It does not persist changes or reproduce Supabase Auth, Row Level Security (RLS), database transactions, or Edge Function side effects. Use it to test request/response shapes and frontend handling; use a separate development Supabase project or the local Supabase stack when you need to test real backend behavior.

## 2. Prerequisites and installation

Use the Node.js version specified by the repository's development setup (the project README specifies Node.js 20.x) and npm. From the repository root, install the project dependencies:

```bash
npm install
```

The repository already defines the following scripts in `package.json`:

| Command | Purpose |
| --- | --- |
| `npm run contract:mock` | Start a static Prism mock server on port `4010`, with CORS enabled. |
| `npm run contract:mock:dynamic` | Start Prism on port `4010` in dynamic-generation mode. |
| `npm run dev` | Start Vite, normally on port `5173`. |
| `npm run contract:lint` | Lint the OpenAPI contract using Redocly. |
| `npm run contract:docs` | Rebuild the generated Redoc HTML at `contract/generated/docs/index.html`. |

The Prism scripts invoke `npx @stoplight/prism-cli`. If Prism is not already available locally, `npx` may download it when the command first runs. In this repository snapshot, Prism CLI is not declared in `devDependencies`, so its version is not pinned by `package-lock.json`; that is a dependency-management improvement the team can consider separately. Keep `package-lock.json` committed to reproduce the dependencies that are declared in the project.