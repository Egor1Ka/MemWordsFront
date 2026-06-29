# MemWords deploy

Production config for **memwords.uk** on the Contabo VPS (`213.136.67.77`),
sharing the box with Slotix and Dvir. Mirrors the existing setup exactly.

## How the server is wired (discovered)

```
:80/:443  →  slotix-caddy (the ONE edge proxy)
              ├── slotixs.uk       → web:3000 / api:9000          (network slotix_slotix)
              ├── dvir-online.com  → sportmap-web-1 / -api-1      (network sportmap_default)
              └── memwords.uk      → memwords-web:3000 / memwords-api:9000   (network memwords)  ← we add this

DB: MongoDB Atlas. Images: GHCR (public).
```

slotix-caddy is attached to each app's docker network and routes by domain. We
do the same for MemWords: own `memwords` network + a Caddy block, connected with
`docker network connect` (no Caddy restart, zero downtime for slotix/dvir).

## What YOU do (the bits I can't: secrets, DNS, push)

### 1. DNS
Registrar for `memwords.uk`: `A @ → 213.136.67.77`, `A www → 213.136.67.77`.

### 2. GitHub Secrets
**Both** repos: `SSH_HOST=213.136.67.77`, `SSH_USER=root` (or `deploy`), `SSH_PRIVATE_KEY` (the key already authorized on the server).
**MemWords-Back** only: `DB_URL` (Atlas, use a `memwords` database), `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
Make both GHCR packages **public** (Repo → Packages → visibility) so the server pulls without `docker login`.

### 3. Push (CI builds images → GHCR, and the backend CI writes /opt/memwords/.env.api from the secrets above)
```bash
cd ~/Desktop/AnkiFrontCopy  && git push -u origin main
cd ~/Desktop/AnkiBackendCopy && git push -u origin main
```

### 4. Google OAuth
Add redirect URI in Google Cloud Console: `https://memwords.uk/api/auth/google/callback`.

## Server setup (once)

Copy the compose (no secrets) to the server, then wire Caddy:
```bash
scp deploy/docker-compose.prod.yml deploy@213.136.67.77:/opt/memwords/   # or root@

ssh root@213.136.67.77
# .env.api is written by the backend CI from your GitHub Secrets. (For a manual
# first run instead, copy deploy/.env.api.example to /opt/memwords/.env.api and fill it.)

cd /opt/memwords
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# connect the edge Caddy to the memwords network (live, no restart)
docker network connect memwords slotix-caddy

# add the memwords.uk block to /opt/slotix/Caddyfile (copy from deploy/Caddyfile.snippet)
cp /opt/slotix/Caddyfile /opt/slotix/Caddyfile.bak
nano /opt/slotix/Caddyfile          # paste the memwords.uk + www blocks

# validate, then graceful reload (does NOT drop slotixs.uk / dvir-online.com)
docker exec slotix-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec slotix-caddy caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile
```

Once DNS points at the server, Caddy auto-issues the Let's Encrypt cert for
memwords.uk on first request. Open https://memwords.uk → landing.

## After this, CI is automatic

- Push to `main` in **MemWordsFront** → build web image → `pull memwords-web && up -d memwords-web`
- Push to `main` in **MemWords-Back** → build api image → rewrite `.env.api` from secrets → `pull memwords-api && up -d memwords-api`

## Handy

```bash
cd /opt/memwords
docker compose -f docker-compose.prod.yml logs -f memwords-web
docker compose -f docker-compose.prod.yml logs -f memwords-api
docker exec slotix-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```
