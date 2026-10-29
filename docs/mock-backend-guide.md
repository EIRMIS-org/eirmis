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


## 3. Start the mock server and frontend

Use two terminal windows from the repository root.

### Terminal 1 — Start Prism

```bash
npm run contract:mock
```

Prism should listen at `http://127.0.0.1:4010`. Leave this terminal running. The command loads `contract/openapi.yaml`, which references the endpoint definitions and examples in the `contract/` directory.

### Terminal 2 — Start Vite

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open the frontend at `http://127.0.0.1:5173`. The `--strictPort` option makes Vite exit with an error if port `5173` is already occupied instead of silently choosing another port.

The API mock and frontend use different ports:

| Service | URL | Port |
| --- | --- | ---: |
| Prism mock API | `http://127.0.0.1:4010` | `4010` |
| Vite frontend | `http://127.0.0.1:5173` | `5173` |
| Local Supabase stack (if started) | `http://127.0.0.1:54321` | `54321` |

### Quick Prism smoke test

The contract defines `GET /rest/v1/events` as a public event-discovery operation. After Prism starts, run this from Git Bash, macOS, or Linux. In PowerShell, use `curl.exe` instead of `curl` because `curl` may be an alias:

```bash
curl -i "http://127.0.0.1:4010/rest/v1/events?select=id,title&limit=2"
```

A successful mock request should return an HTTP response with a JSON body. Prism's output is driven by the OpenAPI contract; it is not a query against a real database.


## 4. Select a named OpenAPI example

Prism normally returns an example from the operation's response definition when one is available. To select a particular response example, send the HTTP `Prefer` header in this form:

```http
Prefer: example=<example_name>
```

The example name must match a key under the response's `examples` map for the specific operation and response status in the OpenAPI contract. Example keys are case-sensitive. A named example defined for a request body is not automatically a response example.

### Example from the EIRMIS contract

The `GET /rest/v1/events` operation in `contract/paths/organizer.yaml` defines the response example `OrganizerEventsList`. Request that example with:

```bash
curl -i "http://127.0.0.1:4010/rest/v1/events?select=id,title&limit=2" -H "Prefer: example=OrganizerEventsList"
```

You can inspect other example names directly in `contract/paths/organizer.yaml`, `contract/paths/guest.yaml`, `contract/paths/admin.yaml`, and `contract/paths/functions.yaml`. Look under the operation's `responses` section for a response `content` type and then its `examples` map. Use an example that belongs to the HTTP method, response code, and content type being tested.

If Prism does not select the example you requested, check that the name is spelled exactly as it appears in the contract and that the request is reaching the expected operation and response status. A validation or security response may take precedence over the expected success response.