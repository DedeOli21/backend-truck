#!/bin/bash
set -e

# ==========================================
# DEPLOY BACKEND TRUCK - VPS OVHcloud
# ==========================================
# Script para deploy automatizado na VPS
# IP: 40.160.82.252
#
# USO:
#   1. Envie este script + projeto para a VPS
#   2. chmod +x deploy-vps.sh
#   3. ./deploy-vps.sh
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }

PROJECT_DIR="/opt/backend-truck"
VPS_IP="40.160.82.252"

echo "========================================="
echo "  🚛 DEPLOY BACKEND TRUCK - VPS"
echo "  IP: ${VPS_IP}"
echo "========================================="

# ---------- Verificações ----------
log "Verificando dependencias..."

if ! command -v docker &> /dev/null; then
    error "Docker nao encontrado. Instalando..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
    success "Docker instalado!"
fi

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose nao encontrado. Instalando..."
    apt-get update && apt-get install -y docker-compose-plugin || \
    curl -SL https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose
    success "Docker Compose instalado!"
fi

# ---------- Gera secrets se necessário ----------
generate_secret() {
    openssl rand -hex 32
}

ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    warn "Arquivo $ENV_FILE nao encontrado. Criando com valores padrao..."
    cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=truck_admin
DATABASE_PASSWORD=$(generate_secret)
DATABASE_NAME=truckdb
DATABASE_SSL=false
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173,http://${VPS_IP},http://${VPS_IP}:8080,http://${VPS_IP}:5173
ENABLE_SWAGGER=false
EOF
    success "Arquivo .env.production criado com secrets gerados automaticamente!"
    warn "IMPORTANTE: Salve essas credenciais em um lugar seguro!"
else
    log "Arquivo .env.production ja existe."
    # Adiciona o IP da VPS ao CORS se ainda nao estiver
    if ! grep -q "$VPS_IP" "$ENV_FILE"; then
        sed -i "s|^CORS_ORIGINS=|CORS_ORIGINS=http://${VPS_IP},http://${VPS_IP}:8080,http://${VPS_IP}:5173,|" "$ENV_FILE"
        success "IP da VPS adicionado ao CORS!"
    fi
fi

# ---------- Build e Deploy ----------
log "Parando containers antigos (se existirem)..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

log "Removendo imagens antigas..."
docker compose -f docker-compose.prod.yml rm -f 2>/dev/null || true

log "Buildando imagens..."
docker compose -f docker-compose.prod.yml build --no-cache

log "Iniciando servicos..."
docker compose -f docker-compose.prod.yml up -d

# ---------- Aguarda startup ----------
log "Aguardando inicializacao (30s)..."
sleep 30

# ---------- Verifica saude ----------
log "Verificando saude dos servicos..."

if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    success "Containers rodando!"
else
    error "Algum container nao subiu corretamente."
    docker compose -f docker-compose.prod.yml logs --tail 50
    exit 1
fi

# Testa endpoint
curl -sf http://localhost/health > /dev/null 2>&1 || curl -sf http://localhost/ > /dev/null 2>&1 || true

# ---------- Resumo ----------
echo ""
echo "========================================="
echo "  ✅ DEPLOY CONCLUIDO COM SUCESSO!"
echo "========================================="
echo ""
echo "📍 Endereco publico da API:"
echo "   http://${VPS_IP}"
echo ""
echo "🐳 Containers ativos:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📋 Comandos uteis:"
echo "   Ver logs:        docker compose -f docker-compose.prod.yml logs -f"
echo "   Logs backend:    docker compose -f docker-compose.prod.yml logs -f backend"
echo "   Logs postgres:   docker compose -f docker-compose.prod.yml logs -f postgres"
echo "   Restart:         docker compose -f docker-compose.prod.yml restart"
echo "   Parar tudo:      docker compose -f docker-compose.prod.yml down"
echo "   Entrar no DB:    docker exec -it truck-postgres psql -U truck_admin -d truckdb"
echo "   Backup DB:       docker exec truck-postgres pg_dump -U truck_admin truckdb > backup_$(date +%Y%m%d).sql"
echo ""
echo "🔐 Credenciais salvas em: .env.production"
echo "========================================="
