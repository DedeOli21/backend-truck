#!/bin/bash
set -e

# ==========================================
# ENVIA PROJETO PARA VPS E FAZ DEPLOY
# ==========================================
# Uso: ./deploy-to-vps.sh usuario@40.160.82.252
# ==========================================

VPS_IP="40.160.82.252"
VPS_USER="${1:-root}"
VPS_HOST="${VPS_USER}@${VPS_IP}"
REMOTE_DIR="/opt/backend-truck"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Uso: $0 [usuario@]40.160.82.252"
    echo "Exemplo: $0 ubuntu@40.160.82.252"
    echo "         $0 root@40.160.82.252"
    echo "         $0 40.160.82.252  (usa root como padrao)"
    exit 0
fi

echo "========================================="
echo "  🚀 DEPLOY PARA VPS OVHcloud"
echo "  Destino: ${VPS_HOST}"
echo "  Diretorio remoto: ${REMOTE_DIR}"
echo "========================================="

# ---------- Verifica SSH ----------
log "Testando conexao SSH..."
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new "${VPS_HOST}" "echo OK" > /dev/null 2>&1; then
    error "Nao foi possivel conectar via SSH em ${VPS_HOST}"
    error "Verifique:"
    error "  1. Se a VPS esta ligada e acessivel"
    error "  2. Se voce tem a chave SSH configurada"
    error "  3. Se o usuario e senha/chave estao corretos"
    exit 1
fi
success "Conexao SSH OK!"

# ---------- Envia arquivos ----------
log "Enviando arquivos para a VPS..."

# Cria diretorio remoto
ssh "${VPS_HOST}" "mkdir -p ${REMOTE_DIR}"

# Rsync com exclusoes
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='coverage' \
    --exclude='.git' \
    --exclude='.serverless' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.cline' \
    --exclude='.vscode' \
    --exclude='.vscode-server' \
    --exclude='test' \
    --exclude='.editorconfig' \
    --exclude='.prettierrc' \
    ./ "${VPS_HOST}:${REMOTE_DIR}/"

success "Arquivos enviados!"

# ---------- Executa deploy na VPS ----------
log "Executando deploy na VPS..."
ssh "${VPS_HOST}" "cd ${REMOTE_DIR} && bash deploy-vps.sh"

success "Deploy finalizado!"
echo ""
echo "========================================="
echo "  🌐 SUA API ESTA ONLINE EM:"
echo "  http://${VPS_IP}"
echo "========================================="
