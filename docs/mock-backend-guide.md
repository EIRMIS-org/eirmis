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


## 5. Request dynamic mock data

Dynamic mode asks Prism to generate response values from the schema instead of repeatedly returning the contract's fixed example values. This can help test how the frontend handles different values.

There are two options.

### Option A — Request dynamic output for one call

Keep the normal static mock server running and send:

```bash
curl -i "http://127.0.0.1:4010/rest/v1/events?select=id,title&limit=2" -H "Prefer: dynamic=true"
```

### Option B — Start Prism in dynamic mode

Stop the normal Prism process with `Ctrl+C`, then run:

```bash
npm run contract:mock:dynamic
```

This starts the same contract on port `4010` with Prism's dynamic-generation flag enabled. Restart `npm run contract:mock` when you want the standard example-driven behavior again.

Dynamic output is generated from the OpenAPI schema, so it depends on the completeness and constraints of that schema. It is synthetic test data, not data from Supabase. For more information, see the [Prism HTTP mocking guide](https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md).

## 6. PostgREST `Prefer` headers

The contract documents PostgREST conventions. These headers are meaningful to PostgREST/Supabase requests and are also useful to understand when testing the API contract.

### Request an exact row count

```http
Prefer: count=exact
```

PostgREST reports the total in the response's `Content-Range` header when it supports the requested count. For example, to inspect the documented response header through Prism:

```bash
curl -i "http://127.0.0.1:4010/rest/v1/events?select=id,title&limit=2" -H "Prefer: count=exact"
```

Prism may return the static header example from the contract. Do not treat that fixed example as a real count of database rows.

### Return rows after a write

```http
Prefer: return=representation
```

On supported PostgREST `POST`/`PATCH` requests, this preference asks the live API to return the affected row or rows in the response body. The default behavior may return no row representation. The request must still satisfy the endpoint's schema and authorization requirements.

You may see these two headers in the OpenAPI definitions because list operations document row counts and write operations document when a row representation is returned. Prism simulates contract responses; it does not commit a real database change.


## 7. Configure mock mode or live Supabase mode

The committed environment template is `.env.local.example`. Copy it to `.env.local` and keep `.env.local` out of Git:

```bash
# macOS / Linux / Git Bash
cp .env.local.example .env.local

# Windows Command Prompt
copy .env.local.example .env.local
```

Vite exposes variables prefixed with `VITE_` in the browser bundle. Never put service-role keys, passwords, or other secrets in these variables. The project's template documents `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, and `VITE_STORAGE_BUCKET_DESIGNS`.

### Mock-mode settings

The configuration expected by this task for a frontend API client that supports the mock switch is:

```dotenv
VITE_API_URL=http://127.0.0.1:4010
VITE_USE_MOCK=true
```

Start Prism and Vite using the commands in Section 3. The frontend API client should direct contract API requests to `VITE_API_URL` when mock mode is enabled.

### Live Supabase settings

For live Supabase development, configure the values from a dedicated development/staging project—not production unless your team explicitly authorizes that:

```dotenv
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
VITE_SITE_URL=http://localhost:5173
VITE_STORAGE_BUCKET_DESIGNS=invitation-designs
```

Use the actual project URL, publishable/anon key, site URL, and bucket name for your environment. The API base URL for direct PostgREST requests is the Supabase project URL, with endpoint paths such as `/rest/v1/events`; Edge Functions use paths such as `/functions/v1/<function-name>`. Keep RLS enabled and use test data in a separate development project. Never use `SUPABASE_SERVICE_ROLE_KEY` in frontend code or a `VITE_` variable.

After changing `.env.local`, stop and restart Vite so it reloads the environment. Keep only one active configuration for the mode you are testing, and do not commit `.env.local`.

### Current repository integration note

Task 01 supplies the OpenAPI contract, examples, generated Redoc documentation, and Prism scripts. In the repository snapshot this guide was authored against, the frontend source does not yet read `VITE_API_URL` or `VITE_USE_MOCK`; `.env.local.example` also does not define those two variables, and the app source does not currently provide an API client that switches between Prism and Supabase. Therefore, adding or editing those variables alone does **not** switch the existing frontend at runtime in this snapshot.

The settings above document the configuration contract requested by Issue #85. For the UI to switch automatically, the frontend/API client must be implemented to read `VITE_USE_MOCK` and choose the mock base URL or the configured Supabase backend accordingly. Until that integration exists, use the `curl` examples in this guide to verify Prism independently and follow the current app's established Supabase configuration for live functionality.


## 8. Troubleshooting

| Problem | What to check |
| --- | --- |
| `npm run contract:mock` fails | Run `npm install`; check the terminal error. The script uses `npx @stoplight/prism-cli`. Verify the file path `contract/openapi.yaml` exists from the repository root. |
| Port `4010` is already in use | Stop the other process using that port, or coordinate a different Prism port and update the API base URL consistently. |
| Vite is not available at port `5173` | Check the Vite terminal. Because the command uses `--strictPort`, it exits instead of choosing another port if `5173` is occupied. |
| Prism returns `404` | Confirm the URL includes the exact path from the OpenAPI contract, for example `/rest/v1/events`; don't add the Supabase project path or an extra base path. |
| The requested example is not returned | Check the exact response example key and operation in `contract/paths/*.yaml`; verify the request's method, path, expected status, and `Prefer` header. |
| Dynamic response looks like fixed data | Verify the request includes `Prefer: dynamic=true`, or restart Prism using `npm run contract:mock:dynamic`. Check that the response schema defines suitable properties. |
| Frontend does not switch after editing `.env.local` | Restart Vite and verify that the frontend code reads the variable names. In this repository snapshot, the mock/live API client switch is not implemented yet; see the integration note above. |
| Live Supabase returns `401`/`403` | Check the project URL, publishable/anon key, JWT/session, operation security, and RLS policy. A successful Prism response does not prove live authorization works. |

## 9. Contract maintenance commands

When the OpenAPI contract changes, use the repository scripts to check and regenerate the related artifacts:

```bash
npm run contract:lint
npm run contract:gen
npm run contract:check
npm run contract:docs
```

Review the generated diff before committing. The source of truth is the contract files under `contract/`; do not manually edit `contract/generated/schema.d.ts` or `contract/generated/docs/index.html` in place of updating the source contract.

## References

- [EIRMIS OpenAPI source](../contract/openapi.yaml)
- [Prism HTTP mocking guide](https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md)
- [Prism CLI guide](https://github.com/stoplightio/prism/blob/main/docs/getting-started/03-cli.md)