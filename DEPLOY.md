# Deploying the Intentra progress server

The Bun server in [`mobile-app/server/`](mobile-app/server/) exposes SSE, Intentra HTTP routes, and JSONL watching. Pick **one** path below.

**Related docs:** [Quickstart](docs/quickstart.md) · [Env Reference](docs/env-reference.md) · [Security](docs/security.md) · [Scaling](docs/scaling.md) · [Troubleshooting](docs/troubleshooting.md)

## Prerequisites

- Docker (for image build)
- For Fly.io: [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
- For GHCR: GitHub Actions publishes on push to `main` when server files change (see [`.github/workflows/intentra-docker.yml`](.github/workflows/intentra-docker.yml))

## 1. Docker locally or on any host

```bash
docker build -f mobile-app/server/Dockerfile -t intentra-progress mobile-app/server
docker run --rm -p 7891:7891 \
  -v "$HOME/.gstack:/data/gstack" \
  -v "$(pwd):/repo" \
  -e GSTACK_STATE_DIR=/data/gstack \
  -e INTENTRA_REPO_ROOT=/repo \
  -e INTENTRA_TOKEN="your-secret" \
  intentra-progress
```

Or: `docker compose up --build` from repo root ([`docker-compose.yml`](docker-compose.yml)).

## 2. GitHub Container Registry (CI)

On push to `main`, the **Intentra Docker** workflow builds and pushes:

- `ghcr.io/<owner>/<repo>/intentra-progress:latest`
- `ghcr.io/<owner>/<repo>/intentra-progress:<git-sha>`

Pull and run with the same `-e`/`-v` flags as above. Replace `<owner>/<repo>` with your GitHub `owner/repo` (lowercase).

## 3. Fly.io

1. Edit [`fly.toml`](fly.toml): set `app = "your-unique-name"`.
2. `fly secrets set INTENTRA_TOKEN=...` (optional) and mount or sync `~/.gstack` if you need JSONL (often you only use `POST /progress` from CI in cloud).
3. `fly deploy`

Set secrets for `GSTACK_STATE_DIR` only if you attach a volume; otherwise defaults apply inside the machine.

## 4. Health checks

`GET /health` returns `guard_engine_version`, `guard_rule_count`, and uptime — use for load balancers and deploy verification.

## 5. Mobile + ngrok

After the server is reachable, use ngrok (or Fly’s URL) and paste the HTTPS URL into the Expo app setup screen. See [`mobile-app/README.md`](mobile-app/README.md).
