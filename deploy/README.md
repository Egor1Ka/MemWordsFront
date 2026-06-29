# MemWords deploy

Production config for **memwords.uk** on the Contabo VPS (`213.136.67.77`),
sharing the box with Slotix. Same pattern as `/opt/slotix`.

## Architecture

```
Internet :80/:443
    ↓
Caddy (ONE shared instance, already running in /opt/slotix)
    ├── slotixs.uk        → slotix-web / slotix-api
    └── memwords.uk
            ├── /api/*  → memwords-api:9000   (MemWords-Back)
            └── /*      → memwords-web:3000   (MemWordsFront)

DB: MongoDB Atlas (separate "memwords" database)
Images (GHCR, public):
    ghcr.io/egor1ka/memwordsfront:latest
    ghcr.io/egor1ka/memwords-back:latest
```

There is only ONE Caddy on the server (it owns 80/443). MemWords does **not**
run its own Caddy — it joins a shared `edge` network and the existing Caddy
proxies `memwords.uk` to its containers.

## DNS (do first)

In your domain registrar for `memwords.uk`:

| Type | Host | Value          |
| ---- | ---- | -------------- |
| A    | @    | 213.136.67.77  |
| A    | www  | 213.136.67.77  |

## First-time server setup (run once)

```bash
ssh deploy@213.136.67.77   # or root

# 1. Shared proxy network (idempotent)
docker network create edge 2>/dev/null || true

# 2. Put the existing Caddy on the edge network so it can reach MemWords.
#    Edit /opt/slotix/docker-compose.prod.yml -> caddy service:
#      networks: [slotix, edge]
#    and add at the bottom:
#      networks:
#        edge:
#          external: true
#    then recreate caddy:
cd /opt/slotix && docker compose -f docker-compose.prod.yml up -d caddy

# 3. Add the memwords.uk block to /opt/slotix/Caddyfile
#    (copy from deploy/Caddyfile.snippet), then:
docker compose -f docker-compose.prod.yml restart caddy

# 4. MemWords app dir
mkdir -p /opt/memwords
```

Copy the compose + env template from your Mac:

```bash
scp deploy/docker-compose.prod.yml deploy/.env.api.example deploy@213.136.67.77:/opt/memwords/
ssh deploy@213.136.67.77 'cd /opt/memwords && mv .env.api.example .env.api && nano .env.api'  # fill secrets
ssh deploy@213.136.67.77 'chmod 600 /opt/memwords/.env.api'
```

(After CI is set up, `.env.api` is regenerated from GitHub Secrets on every
backend deploy, so manual editing is only needed for the very first run.)

## First manual deploy

```bash
ssh deploy@213.136.67.77
cd /opt/memwords
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

Open https://memwords.uk → landing. Caddy issues the TLS cert automatically.

## CI/CD (after first deploy works)

- Push to `main` in **MemWordsFront** → builds web image → SSH → `pull web && up -d web`
- Push to `main` in **MemWords-Back** → builds api image → SSH → writes `.env.api` from secrets → `pull api && up -d api`

### GitHub Secrets

In **both** repos:

| Secret            | Value                                              |
| ----------------- | ------------------------------------------------- |
| `SSH_HOST`        | `213.136.67.77`                                   |
| `SSH_USER`        | `deploy`                                          |
| `SSH_PRIVATE_KEY` | full private key authorized on the server         |

In **MemWords-Back** only (used to build `.env.api`):

| Secret                  |
| ----------------------- |
| `DB_URL`                |
| `JWT_SECRET`            |
| `GOOGLE_CLIENT_ID`      |
| `GOOGLE_CLIENT_SECRET`  |
| `CLOUDINARY_CLOUD_NAME` |
| `CLOUDINARY_API_KEY`    |
| `CLOUDINARY_API_SECRET` |

GHCR uses the built-in `GITHUB_TOKEN`. Make both packages **public**
(Repo → Packages → Package settings → Change visibility) so the server pulls
without `docker login`.

## Google OAuth

In Google Cloud Console → Credentials → OAuth client, add the redirect URI:

```
https://memwords.uk/api/auth/google/callback
```

## Common commands

```bash
cd /opt/memwords
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```
