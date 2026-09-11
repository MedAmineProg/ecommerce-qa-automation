# Local SquashTM instance

A local, throwaway SquashTM + PostgreSQL stack, used only to verify
`src/reporting/squashtm-exporter`'s live REST API integration
(`api-client.ts`, the `--push` flag) against a real server instead of
mocked responses. **Not for production use** — default credentials, no
TLS, no backup strategy.

## Image choice

The task that produced this originally pointed at two community Docker
images (`fjudith/squash-tm`, `Logicify/docker-squash-tm`) to pick between.
Neither is used here — both are abandoned, packaging SquashTM 1.18.5 and
1.14.0 respectively (current SquashTM is on the 14.x/15.x line). This
compose file uses the **official `squashtest/squash` image** instead,
published directly by the Squashtest org on Docker Hub and updated
regularly (nightly builds; `15.0.0` — what this was verified against — is
pinned here rather than `latest`, per Docker Hub's own recommendation).

## Setup

```bash
cp .env.example .env
# Generate a real secret and paste it into .env as SQUASH_REST_API_JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

docker compose up -d
```

Without that secret, the containers still start fine, but SquashTM's own
UI fails Personal API token creation with "No JWT secret is defined for
this instance." — discovered the hard way during verification. See
`../src/reporting/squashtm-exporter/README.md` for the full story of why
that secret is needed at all (short version: Basic auth is rejected
outright by the REST API on current SquashTM versions, so a Bearer token
is the only way in, and generating one requires this).

**Boot time**: on this machine, cold image pull (~470MB) plus first boot
took a few minutes total; once the image is cached locally, the app alone
takes about **2 minutes** from `docker compose up -d` to responding on
`http://localhost:8090/squash/` (measured directly, not the 3-4 minutes
the official docs quote — your mileage will vary with disk/CPU). Poll for
readiness rather than guessing a fixed sleep:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/squash/ | grep -qE "^(200|302|401)$"; do sleep 5; done
```

## Logging in / getting an API token

Default credentials: `admin` / `admin`.

1. Log in at `http://localhost:8090/squash/login`.
2. Go to **My account** (bottom-left avatar) → **Personal API tokens** → **+**.
3. Give it a name, pick **Read and write**, click **Add**.
4. Copy the token shown — it's shown once. **It is base64-encoded; decode
   it once before using it as your `SQUASHTM_API_TOKEN`** (see the
   exporter module's README for why, and why this can't be scripted —
   there's no working bootstrap-via-API path, only the UI).

There is no API endpoint to create the initial project/test
case/campaign/iteration structure faster than the REST API calls
documented in the exporter module's README — this repo doesn't ship a
seed script for that, since the whole point was verifying the *exporter*,
not building a SquashTM fixtures generator.

## Tearing down

```bash
docker compose down -v   # -v also drops the named volumes (DB data, logs)
```
