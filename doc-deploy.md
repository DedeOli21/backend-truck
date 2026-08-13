Tudo pronto! Criei a stack completa Docker para produção na sua VPS OVHcloud. Aqui está o resumo:

---

## 📦 O que foi criado

| Arquivo | Descrição |
|---------|-----------|
| `Dockerfile.prod` | Build multi-estágio do NestJS (otimizado para produção) |
| `docker-compose.prod.yml` | Orquestração: PostgreSQL + Backend + Nginx |
| `docker-entrypoint.sh` | Inicialização do container (espera DB → migrations → start) |
| `nginx/nginx.conf` | Reverse proxy na porta 80 → backend:3000 |
| `.env.production` | Variáveis de ambiente para produção |
| `deploy-vps.sh` | Script de deploy automatizado (roda **dentro** da VPS) |
| `deploy-to-vps.sh` | Script que envia o projeto via SSH e executa o deploy |
| `src/common/controllers/health.controller.ts` | Endpoint `/health` para monitoramento |

---

## 🏗️ Arquitetura na VPS

```
[ INTERNET ]
     │
     ▼
[ Nginx :80 ]  ←── Reverse proxy
     │
     ▼
[ Backend :3000 ]  ←── NestJS + API
     │
     ▼
[ PostgreSQL :5432 ]  ←── Banco de dados (rede interna Docker)
```

---

## 🚀 Como fazer o deploy

### Opção 1: Script automatizado (recomendado)

No seu computador local (onde está o projeto), execute:

```bash
# Substitua "ubuntu" pelo usuário da sua VPS (pode ser root, ubuntu, debian...)
./deploy-to-vps.sh ubuntu@40.160.82.252
```

Isso vai:
1. Enviar todos os arquivos via rsync
2. Instalar Docker e Docker Compose (se não tiver)
3. Buildar as imagens
4. Subir os containers
5. Executar as migrations automaticamente

---

### Opção 2: Manual na VPS

Se preferir fazer na VPS diretamente:

```bash
# 1. Entre na VPS via SSH
ssh usuario@40.160.82.252

# 2. Instale Docker (se não tiver)
curl -fsSL https://get.docker.com | sh

# 3. Envie o projeto para a VPS (do seu computador)
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.git' \
  ./ usuario@40.160.82.252:/opt/backend-truck/

# 4. Na VPS, execute o deploy
cd /opt/backend-truck
sudo bash deploy-vps.sh
```

---

## 🔗 URL para seu frontend

Após o deploy, a API estará acessível em:

```
http://40.160.82.252
```

### Rotas disponíveis:

| Rota | Descrição |
|------|-----------|
| `GET /health` | Verificação de saúde do servidor |
| `POST /auth/login` | Login |
| `POST /auth/register` | Cadastro |
| `GET /transactions` | Listar transações |
| `POST /transactions` | Criar transação |
| `GET /finance` | Dados financeiros |
| `GET /payables` | Contas a pagar |

### Exemplo de chamada do frontend:

```javascript
const API_URL = 'http://40.160.82.252';

// Login
fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '...', password: '...' })
});

// Listar transações
fetch(`${API_URL}/transactions`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## ⚙️ Configuração do CORS

O arquivo `.env.production` já inclui o IP da VPS no `CORS_ORIGINS`. **Quando tiver o domínio do frontend**, edite:

```bash
# Na VPS
cd /opt/backend-truck
nano .env.production

# Altere a linha CORS_ORIGINS para incluir seu domínio:
CORS_ORIGINS=https://meufrontend.com,http://40.160.82.252

# Depois reinicie:
docker compose -f docker-compose.prod.yml restart backend
```

---

## 🔐 Segurança - IMPORTANTE!

Antes do deploy, **edite o `.env.production`** e troque as senhas padrão:

```bash
nano /home/david/projeto-freela/backend-truck/.env.production
```

Altere:
- `JWT_SECRET` (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET` (mínimo 32 caracteres)
- `DATABASE_PASSWORD` (senha forte do PostgreSQL)

---

## 📋 Comandos úteis na VPS

```bash
# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Logs apenas do backend
docker compose -f docker-compose.prod.yml logs -f backend

# Restart do backend
docker compose -f docker-compose.prod.yml restart backend

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Backup do banco de dados
docker exec truck-postgres pg_dump -U truck_admin truckdb > backup_$(date +%Y%m%d).sql

# Acessar o banco
docker exec -it truck-postgres psql -U truck_admin -d truckdb
```

---

Quer que eu execute o deploy agora? Se sim, me confirme:
1. **Qual usuário SSH você usa na VPS?** (ex: `root`, `ubuntu`, `debian`)
2. **Você tem acesso SSH configurado com chave ou senha?**

Ou se preferir, pode rodar `./deploy-to-vps.sh usuario@40.160.82.252` diretamente no terminal.Liene@oli205