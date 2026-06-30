#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# StreamHub — One-shot Oracle Cloud (or any Ubuntu VPS) deploy script
#
# Run this on a fresh Ubuntu 22.04 / 24.04 VM as the `ubuntu` user.
# It will:
#   1. Install Docker + Compose + Certbot
#   2. Open OS-level firewall ports 80 + 443
#   3. Clone or update the StreamHub repo
#   4. Build + start all 3 services (frontend, backend, cs3-bridge) + nginx
#   5. Print the public URL and next steps
#
# Usage:
#   ssh ubuntu@<vm-ip>
#   curl -fsSL https://raw.githubusercontent.com/ansaribilal14/Streamme/main/deploy/oracle-deploy.sh | bash
#
#   Or, if you've already cloned the repo:
#   cd Streamme && bash deploy/oracle-deploy.sh
#
# Optional env vars (set before running):
#   STREAMHUB_REPO     - git URL (default: ansaribilal14/Streamme)
#   STREAMHUB_BRANCH   - branch (default: main)
#   STREAMHUB_DOMAIN   - your domain (e.g. streamhub.example.com) — required for HTTPS
#   TMDB_API_KEY       - optional, enables TMDB metadata
#   ADMIN_PIN_HASH     - optional, pre-hashed admin PIN (use scripts/generate-pin-hash.js)
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO="${STREAMHUB_REPO:-https://github.com/ansaribilal14/Streamme.git}"
BRANCH="${STREAMHUB_BRANCH:-main}"
DOMAIN="${STREAMHUB_DOMAIN:-}"
INSTALL_DIR="${STREAMHUB_INSTALL_DIR:-$HOME/Streamme}"

# Colors
red()    { echo -e "\033[31m$1\033[0m"; }
green()  { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue()   { echo -e "\033[34m$1\033[0m"; }

echo ""
blue "╔══════════════════════════════════════════════════════════════╗"
blue "║          StreamHub — Oracle Cloud / VPS Deployer            ║"
blue "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Pre-flight checks ──────────────────────────────────────────────────────
if [[ $EUID -eq 0 ]]; then
    yellow "⚠️  Don't run this as root. Run as the 'ubuntu' user (script will sudo when needed)."
    exit 1
fi

ARCH=$(uname -m)
blue "▸ Detected architecture: $ARCH"
if [[ "$ARCH" == "aarch64" ]]; then
    blue "▸ Ampere ARM detected — Docker images will build natively for arm64 ✓"
elif [[ "$ARCH" == "x86_64" ]]; then
    blue "▸ x86_64 detected — Docker images will build natively for amd64 ✓"
else
    yellow "⚠️  Unusual architecture: $ARCH — your mileage may vary."
fi

# ─── Step 1: Install Docker + Compose ───────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo ""
    blue "▸ Step 1/6: Installing Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker "$USER"
    rm /tmp/get-docker.sh
    green "  ✓ Docker installed"
else
    green "  ✓ Docker already installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
fi

# Verify compose (v2 plugin)
if ! docker compose version &> /dev/null; then
    blue "▸ Installing docker-compose-plugin..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
fi
green "  ✓ Docker Compose: $(docker compose version --short)"

# ─── Step 2: Open OS firewall ports 80 + 443 ───────────────────────────────
echo ""
blue "▸ Step 2/6: Configuring OS firewall (iptables)..."
if command -v iptables &> /dev/null; then
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    if command -v netfilter-persistent &> /dev/null; then
        sudo netfilter-persistent save 2>/dev/null || true
    else
        sudo apt-get install -y -qq iptables-persistent 2>/dev/null || true
        sudo netfilter-persistent save 2>/dev/null || true
    fi
    green "  ✓ iptables rules added (ports 80, 443)"
else
    yellow "  ⚠ iptables not found — skipping OS firewall config"
fi

yellow "  ⚠ IMPORTANT: Also open ports 80 + 443 in the Oracle Cloud Security List!"
yellow "    VM details → Subnet → Security Lists → Add Ingress Rules"
yellow "    Source: 0.0.0.0/0, Protocol: TCP, Dest Port: 80  (and another for 443)"
echo ""
read -p "  Press Enter once you've added the Oracle Security List rules (or to skip)... " < /dev/tty

# ─── Step 3: Clone or update repo ───────────────────────────────────────────
echo ""
blue "▸ Step 3/6: Cloning StreamHub repo..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
    blue "  Found existing clone at $INSTALL_DIR — pulling latest..."
    cd "$INSTALL_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    git clone --depth 1 -b "$BRANCH" "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
green "  ✓ Repo at $(pwd)"

# ─── Step 4: Configure .env ─────────────────────────────────────────────────
echo ""
blue "▸ Step 4/6: Configuring .env..."
if [[ ! -f .env ]]; then
    cp .env.example .env
    green "  ✓ Created .env from .env.example"
else
    yellow "  ⚠ .env already exists — leaving it alone"
fi

# Patch in env vars passed from the shell
if [[ -n "$TMDB_API_KEY" ]]; then
    sed -i "s|^TMDB_API_KEY=.*|TMDB_API_KEY=$TMDB_API_KEY|" .env
    green "  ✓ TMDB_API_KEY set from env"
fi
if [[ -n "$ADMIN_PIN_HASH" ]]; then
    sed -i "s|^ADMIN_PIN_HASH=.*|ADMIN_PIN_HASH=$ADMIN_PIN_HASH|" .env
    green "  ✓ ADMIN_PIN_HASH set from env"
else
    yellow "  ⚠ ADMIN_PIN_HASH not set — you'll set the PIN via the /admin page on first visit"
fi

# ─── Step 5: Build + launch ─────────────────────────────────────────────────
echo ""
blue "▸ Step 5/6: Building Docker images (this takes 2-5 min on first run)..."
docker compose -f docker-compose.yml --profile prod up -d --build
green "  ✓ All services started"

echo ""
blue "▸ Service status:"
docker compose ps

# ─── Step 6: Verify + HTTPS hint ────────────────────────────────────────────
echo ""
blue "▸ Step 6/6: Verifying deployment..."
sleep 5

PUBLIC_IP=$(curl -fsSL https://ifconfig.me 2>/dev/null || echo "<vm-ip>")

echo ""
if curl -fsSL "http://localhost/health" &> /dev/null; then
    green "  ✓ Health check passed (backend responding through Nginx)"
else
    yellow "  ⚠ Health check failed — check logs with: docker compose logs"
fi

# ─── Final report ───────────────────────────────────────────────────────────
echo ""
green "╔══════════════════════════════════════════════════════════════╗"
green "║                  🎉 Deployment Complete!                    ║"
green "╚══════════════════════════════════════════════════════════════╝"
echo ""
blue "StreamHub is now running:"
echo "  • HTTP:  http://$PUBLIC_IP"
[[ -n "$DOMAIN" ]] && echo "  • Domain: http://$DOMAIN"
echo ""
echo "  Services (Docker containers):"
echo "    - frontend  (Next.js PWA)"
echo "    - backend   (Fastify API + SQLite)"
echo "    - cs3bridge (CloudStream-compatible providers)"
echo "    - nginx     (reverse proxy on ports 80/443)"
echo ""
yellow "── Next steps ──"
echo ""
echo "1. Set admin PIN:"
echo "   Open http://$PUBLIC_IP/admin → set a 4-8 digit PIN"
echo ""
echo "2. Add TMDB API key (optional but recommended):"
echo "   Get one free at https://www.themoviedb.org/settings/api"
echo "   Then paste it in Admin → Settings → API Keys"
echo ""
if [[ -n "$DOMAIN" ]]; then
    echo "3. Set up HTTPS (recommended — your PIN travels in plaintext over HTTP):"
    echo "   sudo apt install -y certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d $DOMAIN"
    echo ""
    echo "   Certbot will auto-edit nginx.conf to enable HTTPS + auto-renew."
else
    echo "3. Set up HTTPS (recommended):"
    echo "   Point an A record at $PUBLIC_IP, then:"
    echo "   sudo apt install -y certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d yourdomain.com"
fi
echo ""
echo "4. Lock down admin routes to your IP:"
echo "   Edit nginx/conf.d/streamhub-locations.conf"
echo "   Find the geo \$is_trusted_admin block"
echo "   Add: <your-public-ip> 1;"
echo "   Then: docker compose restart nginx"
echo ""
echo "5. Point the StreamHub Android APK at this server:"
echo "   Install the APK → long-press → Settings"
echo "   Server URL: http://$PUBLIC_IP  (or https://$DOMAIN after HTTPS)"
echo ""
echo "6. Useful commands:"
echo "   docker compose logs -f              # follow all logs"
echo "   docker compose logs -f backend      # just backend"
echo "   docker compose restart backend      # restart one service"
echo "   docker compose down                 # stop everything"
echo "   docker compose up -d --build        # rebuild after code update"
echo ""
blue "Done. Enjoy StreamHub! 🎬"
