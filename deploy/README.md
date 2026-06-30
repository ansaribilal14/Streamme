# StreamHub — Production Deployment Guide

> Comprehensive guide for deploying StreamHub to Oracle Cloud Free Tier, AWS, GCP, or any Ubuntu VPS.

## Table of Contents

1. [One-Shot Deploy](#one-shot-deploy)
2. [Manual Step-by-Step (Oracle Cloud)](#manual-step-by-step-oracle-cloud)
3. [Security Hardening](#security-hardening)
4. [HTTPS Setup](#https-setup)
5. [Pointing the Android APK at Your Server](#pointing-the-android-apk-at-your-server)
6. [Updating StreamHub](#updating-streamhub)
7. [Backup & Restore](#backup--restore)
8. [Troubleshooting](#troubleshooting)

---

## One-Shot Deploy

On a fresh Ubuntu 22.04 / 24.04 VM:

```bash
ssh ubuntu@<your-vm-public-ip>

# Generate a bcrypt PIN hash locally (optional — you can also set the PIN via /admin later)
# (Requires Node.js on your local machine)
git clone https://github.com/ansaribilal14/Streamme.git /tmp/sh
node /tmp/sh/scripts/generate-pin-hash.js
# → copy the printed ADMIN_PIN_HASH line

# Run the deploy script
curl -fsSL https://raw.githubusercontent.com/ansaribilal14/Streamme/main/deploy/oracle-deploy.sh \
  | ADMIN_PIN_HASH='$2b$10$...' bash
```

Or, with a domain + TMDB key:

```bash
curl -fsSL https://raw.githubusercontent.com/ansaribilal14/Streamme/main/deploy/oracle-deploy.sh \
  | STREAMHUB_DOMAIN=streamhub.example.com \
    TMDB_API_KEY=your_tmdb_key \
    ADMIN_PIN_HASH='$2b$10$...' \
    bash
```

The script handles Docker install, firewall rules, repo clone, image build, and service startup. It prints the public URL at the end.

---

## Manual Step-by-Step (Oracle Cloud)

### 1. SSH in and update

```bash
ssh ubuntu@<your-vm-public-ip>
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker + Compose

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### 3. Configure the firewall (Oracle has two layers — both must be opened)

**a) OS-level firewall (iptables, on the VM itself):**

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**b) Oracle Cloud Security List (in the web console):**

Go to your VM's subnet → Security Lists → Add Ingress Rules:

| Source | Protocol | Dest Port | Purpose |
|---|---|---|---|
| `0.0.0.0/0` | TCP | 80 | HTTP |
| `0.0.0.0/0` | TCP | 443 | HTTPS |

**Do NOT open ports 3000, 4000, or 5000 publicly** — those stay internal to Docker's network. Only Nginx (80/443) is exposed.

> ⚠️ This second step trips people up constantly — the OS firewall being open isn't enough. Oracle blocks at the network layer too.

### 4. Get your code onto the VM

```bash
git clone https://github.com/ansaribilal14/Streamme.git streamhub
cd streamhub
```

### 5. Set up secrets

```bash
cp .env.example .env
nano .env
```

Fill in:
- `TMDB_API_KEY` — get a free key at https://www.themoviedb.org/settings/api
- `OPENSUBTITLES_API_KEY` — optional, for subtitle search
- `ADMIN_PIN_HASH` — optional bcrypt hash of your admin PIN

To generate the PIN hash locally (you only need Node.js):

```bash
node scripts/generate-pin-hash.js
# → prints: ADMIN_PIN_HASH=$2b$10$...
# → paste into .env
```

Alternatively, leave `ADMIN_PIN_HASH` blank and set the PIN via the `/admin` page on first visit.

### 6. Launch

```bash
docker compose --profile prod up -d --build
docker compose ps
docker compose logs -f
```

Check all four containers (frontend, backend, cs3bridge, nginx) show as healthy/running.

### 7. Verify

```bash
# Health check (from inside the VM)
curl http://localhost/health
# → {"status":"ok","ts":"..."}

# Get your public IP
curl https://ifconfig.me
# → 132.145.xxx.xxx

# From another machine, open the browser at:
# http://132.145.xxx.xxx
```

---

## Security Hardening

### Lock down admin routes by IP

Edit `nginx/conf.d/streamhub-locations.conf` and find the `geo $is_trusted_admin` block:

```nginx
geo $is_trusted_admin {
    default 0;
    127.0.0.1 1;
    ::1 1;
    172.16.0.0/12 1;       # Docker internal
    192.168.0.0/16 1;      # LAN
    10.0.0.0/8 1;          # LAN

    # ─── ADD YOUR PUBLIC IP HERE ───
    203.0.113.42 1;        # ← replace with your actual IP (https://ifconfig.me)
}
```

Then restart Nginx:

```bash
docker compose restart nginx
```

Now `/api/admin/*` returns 403 from any IP not in the allowlist. The PIN is still required on top of this — defense in depth.

### Other security notes

- **Never expose ports 3000/4000/5000 publicly.** Only 80/443 should be reachable externally. The `docker-compose.yml` (prod profile) already uses `expose:` instead of `ports:` for the internal services.
- **PIN alone is not enough** if the box is internet-facing — always combine with the IP allowlist above.
- **HTTPS is mandatory** before regular use. Your PIN and watch history travel in plaintext over HTTP otherwise. See [HTTPS Setup](#https-setup) below.
- **Rotate your GitHub PAT and Telegram bot token** if they were ever shared in chat (they were in this project's chat — please rotate them).

---

## HTTPS Setup

### 1. Point a domain at your VM

Add an A record in your DNS provider:

```
streamhub.example.com.  A  300  132.145.xxx.xxx
```

### 2. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Run Certbot

Certbot will auto-edit `nginx/nginx.conf` to enable HTTPS + auto-renew.

```bash
# Temporarily stop docker nginx so certbot can use port 80
docker compose stop nginx

# Get the cert
sudo certbot certonly --standalone -d streamhub.example.com

# Save the cert paths (certbot prints them at the end):
#   /etc/letsencrypt/live/streamhub.example.com/fullchain.pem
#   /etc/letsencrypt/live/streamhub.example.com/privkey.pem
```

### 4. Mount the certs into the Nginx container

Edit `docker-compose.yml` and update the nginx volumes:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - /etc/letsencrypt:/etc/nginx/ssl:ro     # ← mount letsencrypt dir
```

### 5. Enable the HTTPS server block in nginx.conf

Edit `nginx/nginx.conf` and uncomment the HTTPS server block, replacing the cert paths:

```nginx
server {
    listen 443 ssl http2;
    server_name streamhub.example.com;
    ssl_certificate /etc/nginx/ssl/live/streamhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/streamhub.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    include /etc/nginx/conf.d/streamhub-locations.conf;
}
```

Also uncomment the HTTP→HTTPS redirect in the port-80 server block:

```nginx
server {
    listen 80 default_server;
    server_name streamhub.example.com;
    return 301 https://$host$request_uri;
}
```

### 6. Restart Nginx

```bash
docker compose up -d nginx
```

### 7. Verify auto-renew

Certbot installs a systemd timer that auto-renews 30 days before expiry. Verify:

```bash
sudo certbot renew --dry-run
```

---

## Pointing the Android APK at Your Server

1. Install the StreamHub APK on your phone (sent via Telegram earlier, or build via `scripts/build-apk.sh`).
2. Open the app — it will try `http://10.0.2.2:3000` (emulator default) and fail.
3. Tap **Settings** on the error screen (or long-press anywhere in the WebView).
4. Enter your server URL:
   - With HTTPS: `https://streamhub.example.com`
   - Without HTTPS (LAN only): `http://192.168.1.50`
5. Tap **Test** to verify connectivity.
6. Tap **Save** and restart the app.

---

## Updating StreamHub

To pull the latest code and rebuild:

```bash
cd ~/Streamme
git pull
docker compose --profile prod up -d --build
```

This rebuilds all images and restarts the services with zero downtime (Docker handles the rolling restart).

To update just the providers (download new `.cs3` files):

```bash
bash scripts/update-providers.sh
```

---

## Backup & Restore

### Backup

```bash
bash scripts/backup.sh
# → writes to ./backups/streamhub-YYYYMMDD-HHMMSS.tar.gz
# → keeps last 14 backups
```

Set up a daily cron:

```bash
crontab -e
# Add:
0 3 * * * cd /home/ubuntu/Streamme && bash scripts/backup.sh >> backups/backup.log 2>&1
```

### Restore

```bash
# Stop services
docker compose down

# Extract backup
tar xzf backups/streamhub-20250115-030000.tar.gz -C /tmp/

# Restore DB
cp /tmp/streamhub-backup/streamhub.db database/streamhub.db
cp /tmp/streamhub-backup/.env .env
cp -r /tmp/streamhub-backup/extensions/* cs3-bridge/extensions/

# Restart
docker compose --profile prod up -d --build
```

### Off-site backup (recommended)

Oracle free-tier VMs can be reclaimed under their fair-use policy if idle. Sync backups to S3, Backblaze B2, or Dropbox:

```bash
# Example: sync to Backblaze B2 with rclone
rclone sync backups/ myb2:streamhub-backups/
```

---

## Troubleshooting

### "Cannot reach StreamHub backend" in the browser

```bash
# Check if services are running
docker compose ps

# Check Nginx logs
docker compose logs nginx --tail 50

# Check backend logs
docker compose logs backend --tail 50

# Health check from inside the VM
curl http://localhost/health
```

### Oracle Cloud: ports 80/443 unreachable from outside

You skipped step 3b. Go to:
- Oracle Cloud Console → Networking → Virtual Cloud Networks → your VCN → Subnets → your subnet → Security Lists
- Add Ingress Rules for TCP 80 and 443 from `0.0.0.0/0`

### ARM (Ampere) compatibility issues

Oracle's free tier defaults to ARM (aarch64). All StreamHub images support arm64 natively (`node:20-alpine` and `nginx:alpine` have arm64 variants). If you hit weird issues:

```bash
# Force platform
docker compose build --platform linux/arm64
# Or for cross-build (slower):
docker compose build --platform linux/amd64
```

### Database is locked / SQLite errors

```bash
# Stop services
docker compose down

# Backup + repair
cp database/streamhub.db database/streamhub.db.broken
sqlite3 database/streamhub.db ".recover" > /tmp/recovered.sql
mv database/streamhub.db database/streamhub.db.broken
sqlite3 database/streamhub.db < /tmp/recovered.sql

# Restart
docker compose --profile prod up -d
```

### Provider search returns 0 results

1. Check that providers are enabled: Admin → Providers
2. Check the bridge is up: `docker compose logs cs3bridge`
3. Try the demo provider (StreamHub) — it always returns results for any query
4. Add real `.cs3` files to `cs3-bridge/extensions/` and click "Update All" in admin

### Admin page says 403 Forbidden

Your IP isn't in the admin allowlist. Either:
- Add your IP to `nginx/conf.d/streamhub-locations.conf` (the `geo $is_trusted_admin` block)
- Or SSH-tunnel: `ssh -L 8888:localhost:80 ubuntu@<vm-ip>` then open `http://localhost:8888/admin`

---

## Quick Reference

| File / Dir | Purpose |
|---|---|
| `docker-compose.yml` | Production compose (Nginx on 80/443, internal services hidden) |
| `docker-compose.dev.yml` | Dev compose (all ports exposed for debugging) |
| `.env` | API keys + admin PIN hash (never commit) |
| `nginx/nginx.conf` | Nginx main config (HTTP + HTTPS server blocks) |
| `nginx/conf.d/streamhub-locations.conf` | URL routing + admin IP allowlist |
| `scripts/setup.sh` | First-time local dev setup |
| `scripts/backup.sh` | SQLite + .env backup with 14-day retention |
| `scripts/update-providers.sh` | Pull latest `.cs3` files from repos |
| `scripts/generate-pin-hash.js` | Generate bcrypt hash for admin PIN |
| `deploy/oracle-deploy.sh` | One-shot Oracle Cloud / VPS deploy script |
