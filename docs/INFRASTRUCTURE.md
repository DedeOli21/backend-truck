# 🏗️ Infraestrutura & DevOps — Backend Truck

> **Última atualização:** 13/08/2026  
> **Autor:** Cline (AI Agent)  
> **Proprietário:** David (DedeOli21)

**Este documento descreve toda a arquitetura de servidores, deploy, acesso e configuração do projeto.** Leia com atenção para entender como tudo está conectado.

---

## 📋 Sumário

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Servidores e Acesso](#servidores-e-acesso)
3. [Backend — VPS OVHcloud](#backend--vps-ovhcloud)
4. [Frontend — Vercel](#frontend--vercel)
5. [DNS & Cloudflare](#dns--cloudflare)
6. [Docker na VPS](#docker-na-vps)
7. [Deploy Automatizado](#deploy-automatizado)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)
9. [Banco de Dados](#banco-de-dados)
10. [SSL / HTTPS](#ssl--https)
11. [Comandos Úteis](#comandos-úteis)
12. [Troubleshooting](#troubleshooting)
13. [Segurança](#segurança)
14. [Contatos e Referências](#contatos-e-referências)

---

## 🌐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  Cloudflare DNS     │      │  Vercel (Frontend)           │
│  amw-transporte.    │      │  front-end-truck.vercel.app  │
│  com.br             │      │  (React + Vite)              │
└─────────┬───────────┘      └──────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  VPS OVHcloud — Ubuntu 22.04                                │
│  IP Público: 40.160.82.252                                  │
│  Localização: França (GRA)                                  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Nginx      │───▶│   Backend    │───▶│  PostgreSQL  │  │
│  │   :80        │    │   NestJS     │    │   :5432      │  │
│  │  (proxy)     │    │   :3000      │    │  (interno)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Cloudflare Tunnel (quick tunnel — temporário)      │   │
│  │  URL: https://xxx.trycloudflare.com                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Componentes principais

| Componente | Tecnologia | Onde roda | Função |
|-----------|------------|-----------|--------|
| **Frontend** | React + Vite + TS | Vercel (serverless) | Interface do usuário |
| **Backend API** | NestJS + Node.js 20 | VPS OVHcloud (Docker) | Regras de negócio, auth |
| **Banco de Dados** | PostgreSQL 15 | VPS OVHcloud (Docker) | Persistência de dados |
| **Reverse Proxy** | Nginx (Alpine) | VPS OVHcloud (Docker) | Expõe API na porta 80 |
| **DNS** | Cloudflare | Nuvem | Resolve domínios, SSL, proteção |
| **Tunnel Temporário** | Cloudflare Tunnel | VPS OVHcloud | HTTPS temporário até domínio próprio |

---

## 🔑 Servidores e Acesso

### VPS OVHcloud (Backend + Banco)

| Dado | Valor |
|------|-------|
| **Provedor** | OVHcloud |
| **IP Público** | `40.160.82.252` |
| **Usuário SSH** | `ubuntu` |
| **Senha SSH** | *(ver anotação pessoal — NÃO versionar)* |
| **Sistema Operacional** | Ubuntu 22.04 LTS |
| **Diretório do projeto** | `/opt/backend-truck` |

**Como acessar via SSH:**
```bash
ssh ubuntu@40.160.82.252
```

**Ou via paramiko (Python):**
```python
import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("40.160.82.252", username="ubuntu", password="SUA_SENHA", timeout=15)
```

---

### Vercel (Frontend)

| Dado | Valor |
|------|-------|
| **URL de produção** | `https://front-end-truck.vercel.app` |
| **Repositório GitHub** | `https://github.com/DedeOli21/frontend-truck` |
| **Branch de deploy** | `main` |
| **Plano** | Hobby (gratuito) |

**Acesso:** [vercel.com](https://vercel.com) — login com GitHub `DedeOli21`

**Deploy automático:** todo push na branch `main` dispara deploy automático.

---

### Cloudflare (DNS + SSL)

| Dado | Valor |
|------|-------|
| **Domínio registrado** | `amw-transporte.com.br` (Registro.br) |
| **Nameservers Cloudflare** | `jermaine.ns.cloudflare.com`, `julissa.ns.cloudflare.com` |
| **Plano** | Free |

**Acesso:** [dash.cloudflare.com](https://dash.cloudflare.com)


---

## 🖥️ Backend — VPS OVHcloud

### Estrutura de diretórios na VPS

```
/opt/backend-truck/
├── docker-compose.prod.yml     # Orquestração dos containers
├── Dockerfile.prod              # Build do backend NestJS
├── docker-entrypoint.sh         # Script de inicialização
├── .env.production              # Variáveis de ambiente (NÃO versionar!)
├── .env                         # Symlink → .env.production
└── nginx/
    └── nginx.conf               # Configuração do reverse proxy
```

### Containers Docker

Rode na VPS para ver os containers:
```bash
docker compose -f /opt/backend-truck/docker-compose.prod.yml ps
```

Saída esperada:
```
NAME            IMAGE                   STATUS          PORTS
─────────────────────────────────────────────────────────
truck-nginx     nginx:alpine            Up (healthy)    0.0.0.0:80->80/tcp
truck-backend   backend-truck-backend   Up              3000/tcp
truck-postgres  postgres:15-alpine      Up (healthy)    5432/tcp
```

### Fluxo de requisição HTTP

```
Internet → Nginx (:80) → Backend (:3000) → PostgreSQL (:5432, rede interna)
```

- Nginx escuta na **porta 80** (HTTP) e repassa para o backend
- PostgreSQL **não expõe porta para fora** — só acessível dentro da rede Docker
- O backend roda na **porta 3000** internamente

---

## ⚡ Frontend — Vercel

### Build e deploy

O frontend é um projeto **React + Vite + TypeScript**. O build gera arquivos estáticos que a Vercel hospeda.

**Como funciona:**
1. Código-fonte fica em `/home/david/projeto-freela/front-end-truck`
2. Push para `main` no GitHub `DedeOli21/frontend-truck`
3. Vercel detecta o push e faz build + deploy automaticamente

**Comando manual (se necessário):**
```bash
cd /home/david/projeto-freela/front-end-truck
vercel --prod
```

### Variáveis do frontend

Arquivo: `/home/david/projeto-freela/front-end-truck/.env`

```env
# Produção
VITE_API_BASE_URL=https://api.amw-transporte.com.br
VITE_API_URL=https://api.amw-transporte.com.br
```

> **Nota:** Enquanto o domínio não estiver ativo, a URL usada pode ser o Cloudflare Tunnel temporário ou o IP direto. Sempre atualize este `.env`, commite e push para aplicar.


---

## 🌍 DNS & Cloudflare

### Domínio: `amw-transporte.com.br`

Registrado no **Registro.br** e gerenciado via **Cloudflare** (nameservers delegados).

### Registros DNS configurados (após ativação)

| Tipo | Nome | Conteúdo | Proxy | Destino |
|------|------|----------|-------|---------|
| A | `@` (raiz) | `76.76.21.21` | 🟠 Sim | Vercel (frontend) |
| A | `api` | `40.160.82.252` | 🟠 Sim | VPS OVHcloud (backend) |

> O CNAME para Vercel em domínios raiz pode não funcionar em todos os casos. Se necessário, use `www` como CNAME para `cname.vercel-dns.com` e redirecione `@` → `www`.

### SSL no Cloudflare

Configuração recomendada após ativação:
1. Vá em **SSL/TLS** → **Overview**
2. Selecione modo **Full (strict)**
3. Isso garante criptografia entre: Cliente ↔ Cloudflare ↔ VPS

---

## 🐳 Docker na VPS

### docker-compose.prod.yml

Orquestra 3 serviços:

#### 1. PostgreSQL (`truck-postgres`)
```yaml
image: postgres:15-alpine
env_file: .env.production
volumes: postgres_data:/var/lib/postgresql/data
healthcheck: pg_isready
```

#### 2. Backend NestJS (`truck-backend`)
```yaml
build:
  context: .
  dockerfile: Dockerfile.prod
env_file: .env.production
depends_on:
  postgres:
    condition: service_healthy
```

#### 3. Nginx (`truck-nginx`)
```yaml
image: nginx:alpine
ports: "80:80"
volumes: ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

### Dockerfile.prod (Multi-estágio)

```
Estágio 1 (builder):  node:20-alpine → build do NestJS (dist/)
Estágio 2 (runtime):  node:20-alpine → roda a aplicação
```

Vantagens:
- Imagem final pequena (sem devDependencies, sem código-fonte)
- Build otimizado com `npm ci`

### docker-entrypoint.sh

O que o script faz ao iniciar o container:

1. **Verifica arquivos compilados** (`dist/`)
2. **Aguarda PostgreSQL** ficar pronto (`pg_isready`)
3. **Executa migrations** do TypeORM automaticamente
4. **Inicia o servidor** Node.js na porta 3000

Se as migrations falharem via CLI, há um **fallback em JavaScript** que carrega o `DataSource` diretamente.

---

## 🚀 Deploy Automatizado

### Script: `deploy_vps.py`

Local: `/home/david/projeto-freela/backend-truck/deploy_vps.py`

**O que ele faz:**
1. Conecta na VPS via SSH (paramiko)
2. Envia os arquivos necessários via SFTP:
   - `docker-compose.prod.yml`
   - `Dockerfile.prod`
   - `docker-entrypoint.sh`
   - `.env.production`
3. Cria symlink `.env → .env.production`
4. Para containers antigos (`docker compose down`)
5. Remove volume corrompido (se existir)
6. Faz build e sobe tudo (`docker compose up --build -d`)
7. Espera 15 segundos e exibe logs
8. Testa o endpoint `/health`

**Como executar (da máquina local):**
```bash
cd /home/david/projeto-freela/backend-truck
python3 deploy_vps.py
```

**Dependências:** `paramiko` (Python)
```bash
pip3 install paramiko
```

**⚠️ Cuidado:** o script contém senha SSH em texto plano. Mantenha-o seguro e não versione no Git!


---

## 🔐 Variáveis de Ambiente

### `.env.production` (VPS)

Local: `/home/david/projeto-freela/backend-truck/.env.production`

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente | `production` |
| `PORT` | Porta interna do backend | `3000` |
| `JWT_SECRET` | Chave para tokens JWT | *(gerada automaticamente)* |
| `JWT_REFRESH_SECRET` | Chave para refresh tokens | *(gerada automaticamente)* |
| `DATABASE_HOST` | Host do PostgreSQL (Docker) | `postgres` |
| `DATABASE_PORT` | Porta do PostgreSQL | `5432` |
| `DATABASE_USER` | Usuário do banco | `truck_admin` |
| `DATABASE_PASSWORD` | Senha do banco | *(gerada automaticamente)* |
| `DATABASE_NAME` | Nome do banco | `truckdb` |
| `DATABASE_SSL` | SSL no banco (interno) | `false` |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `https://front-end-truck.vercel.app,...` |
| `ENABLE_SWAGGER` | Documentação Swagger | `false` |

**⚠️ IMPORTANTE:**
- Este arquivo **nunca** deve ser commitado no Git
- As senhas foram geradas automaticamente e são únicas
- Para alterar CORS (adicionar novo domínio), edite `CORS_ORIGINS` e rode o deploy novamente

---

## 🗄️ Banco de Dados

### PostgreSQL 15 (Alpine)

Roda dentro do container `truck-postgres` na rede interna Docker.

### Acessar o banco (via VPS)

```bash
# Entrar no container do PostgreSQL
docker exec -it truck-postgres psql -U truck_admin -d truckdb

# Listar tabelas
\dt

# Sair
\q
```

### Backup do banco

```bash
# Na VPS
docker exec truck-postgres pg_dump -U truck_admin truckdb > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore do banco

```bash
# Na VPS
docker exec -i truck-postgres psql -U truck_admin -d truckdb < backup_20260813_120000.sql
```

### Migrations

As migrations são executadas **automaticamente** no startup do backend via `docker-entrypoint.sh`.

**Para rodar manualmente:**
```bash
docker exec -it truck-backend npx typeorm migration:run -d ./dist/database/typeorm/data-source.js
```

---

## 🔒 SSL / HTTPS

### Situação atual (Cloudflare Tunnel temporário)

Como o domínio `amw-transporte.com.br` ainda está em propagação de DNS, usamos um **Cloudflare Quick Tunnel** para HTTPS temporário:

```bash
# Comando usado para iniciar o tunnel
cloudflared tunnel --url http://localhost
```

- Gera uma URL pública tipo: `https://xxx.trycloudflare.com`
- **Grátis**, mas **temporário** (muda se reiniciar)
- Útil para testes e enquanto o DNS não propaga

### Situação futura (domínio próprio)

Após o DNS propagar:

```
https://amw-transporte.com.br      → Frontend (Vercel, já com HTTPS)
https://api.amw-transporte.com.br  → Backend (VPS via Cloudflare SSL)
```

**O Cloudflare Free já inclui SSL automático** para ambos os subdomínios. Não é necessário instalar certificado na VPS (modo "Full" ou "Flexible" do Cloudflare).

Se quiser certificado próprio na VPS (Let's Encrypt):
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d api.amw-transporte.com.br
```
*(Não recomendado se usar Cloudflare proxy — deixe o Cloudflare gerenciar)*


---

## 🛠️ Comandos Úteis

### Na VPS (via SSH)

```bash
# =============================
# GERENCIAMENTO DE CONTAINERS
# =============================

# Ver status de todos os containers
docker compose -f /opt/backend-truck/docker-compose.prod.yml ps

# Ver logs em tempo real (todos)
docker compose -f /opt/backend-truck/docker-compose.prod.yml logs -f

# Logs apenas do backend
docker compose -f /opt/backend-truck/docker-compose.prod.yml logs -f backend

# Logs apenas do PostgreSQL
docker compose -f /opt/backend-truck/docker-compose.prod.yml logs -f postgres

# Restart do backend
docker compose -f /opt/backend-truck/docker-compose.prod.yml restart backend

# Restart de tudo
docker compose -f /opt/backend-truck/docker-compose.prod.yml restart

# Parar todos os containers (mantém volumes)
docker compose -f /opt/backend-truck/docker-compose.prod.yml down

# Parar e remover volumes (CUIDADO: apaga dados do banco!)
docker compose -f /opt/backend-truck/docker-compose.prod.yml down -v

# Rebuild forçado
docker compose -f /opt/backend-truck/docker-compose.prod.yml up --build -d

# =============================
# BANCO DE DADOS
# =============================

# Acessar banco via psql
docker exec -it truck-postgres psql -U truck_admin -d truckdb

# Backup
docker exec truck-postgres pg_dump -U truck_admin truckdb > backup_$(date +%Y%m%d).sql

# =============================
# SISTEMA
# =============================

# Ver uso de disco
df -h

# Ver uso de memória
free -h

# Ver portas abertas
ss -tlnp

# Testar API localmente na VPS
curl -s http://localhost/health
curl -s http://localhost:3000/health
```

### Na máquina local

```bash
# =============================
# DEPLOY
# =============================

# Deploy automatizado via Python
cd /home/david/projeto-freela/backend-truck
python3 deploy_vps.py

# Acessar VPS via SSH
ssh ubuntu@40.160.82.252

# =============================
# VERIFICAÇÃO EXTERNA
# =============================

# Testar health check
curl -s http://40.160.82.252/health

# Verificar CORS
curl -sI -H "Origin: https://front-end-truck.vercel.app" \
  http://40.160.82.252/health

# Testar registro
curl -X POST http://40.160.82.252/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"12345678"}'
```

---

## 🐛 Troubleshooting

### ❌ "Connection refused" ao acessar API

**Causas comuns:**
1. Containers parados
2. Firewall da VPS bloqueando porta 80
3. Nginx não está redirecionando corretamente

**Solução:**
```bash
# Na VPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

docker compose -f /opt/backend-truck/docker-compose.prod.yml ps
docker compose -f /opt/backend-truck/docker-compose.prod.yml restart
```

---

### ❌ Erro CORS no frontend

**Sintoma:** Browser bloqueia requisição com `CORS policy`

**Solução:**
1. Edite `.env.production` na VPS
2. Adicione o domínio do frontend em `CORS_ORIGINS`
3. Rode deploy novamente ou restart o container backend

```bash
# Na VPS
cd /opt/backend-truck
nano .env.production
# Edite CORS_ORIGINS=...

docker compose -f docker-compose.prod.yml restart backend
```

---

### ❌ PostgreSQL não inicia

**Sintoma:** Backend fica reiniciando, logs mostram "connection refused"

**Solução:**
```bash
# Ver logs do postgres
docker logs truck-postgres

# Se volume estiver corrompido, remova (CUIDADO: perde dados!)
docker compose -f /opt/backend-truck/docker-compose.prod.yml down
docker volume rm truck_postgres_data
docker compose -f /opt/backend-truck/docker-compose.prod.yml up -d
```

> **Dica:** sempre faça backup antes de remover volumes!

---

### ❌ Migrations não executam

**Sintoma:** Tabelas não existem, endpoints retornam erro de relação não encontrada

**Solução:**
```bash
# Rodar migrations manualmente
docker exec -it truck-backend npx typeorm migration:run \
  -d ./dist/database/typeorm/data-source.js

# Ou verificar se data-source.js existe
docker exec truck-backend ls -la ./dist/database/typeorm/
```

---

### ❌ Deploy falha no `deploy_vps.py`

**Sintoma:** Script trava ou dá erro de conexão

**Verificações:**
1. Você está conectado à internet?
2. O IP da VPS mudou? (OVHcloud pode realocar)
3. A senha SSH está correta?
4. O Docker está instalado na VPS?

```bash
# Testar SSH manualmente
ssh ubuntu@40.160.82.252

# Na VPS, verificar Docker
docker --version
docker compose version
```

---

### ❌ Cloudflare Tunnel parou

**Sintoma:** URL `trycloudflare.com` não responde mais

**Solução:**
```bash
# Na VPS, reiniciar o tunnel
cloudflared tunnel --url http://localhost

# Ou como serviço systemd (se configurado)
sudo systemctl restart cloudflared-truck
```

> Lembre-se: Quick Tunnels geram **URL nova** a cada execução. Atualize o frontend se necessário.


---

## 🔐 Segurança

### Checklist de segurança

| Item | Status | O que fazer |
|------|--------|-------------|
| Senha SSH forte | ✅ | Troque periodicamente |
| Chave SSH (sem senha) | ⚠️ | Recomendado desabilitar login por senha |
| Firewall UFW | ⚠️ | Configure: `sudo ufw enable` |
| Docker não expõe DB | ✅ | PostgreSQL só na rede interna |
| JWT_SECRET forte | ✅ | Gerado automaticamente (32+ chars) |
| DB_PASSWORD forte | ✅ | Gerado automaticamente |
| `.env.production` no Git | ✅ | Não versionado (verifique `.gitignore`) |
| Swagger desabilitado | ✅ | `ENABLE_SWAGGER=false` |

### Como trocar senhas

```bash
# 1. Edite o .env.production na máquina local
nano /home/david/projeto-freela/backend-truck/.env.production

# 2. Gere novas senhas fortes (exemplo)
openssl rand -hex 32

# 3. Rode o deploy para aplicar
python3 deploy_vps.py
```

### Firewall recomendado (UFW)

```bash
# Na VPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📚 Contatos e Referências

| Recurso | Link / Valor |
|---------|--------------|
| **VPS OVHcloud** | [ovhcloud.com](https://ovhcloud.com) |
| **IP VPS** | `40.160.82.252` |
| **Vercel Dashboard** | [vercel.com/dashboard](https://vercel.com/dashboard) |
| **Cloudflare Dashboard** | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Registro.br** | [registro.br](https://registro.br) |
| **Repositório Backend** | `https://github.com/DedeOli21/backend-truck` *(verificar)* |
| **Repositório Frontend** | `https://github.com/DedeOli21/frontend-truck` |
| **Doc anterior** | `doc-deploy.md` |

---

## 📝 Notas para Futuros Agentes / Desenvolvedores

1. **Sempre leia este arquivo antes de alterar a infraestrutura.**
2. **Nunca commit senhas.** O `.env.production` está no `.gitignore` (verifique!).
3. **Backup antes de destruir volumes.** O banco de dados fica no volume Docker `truck_postgres_data`.
4. **O deploy é idempotente.** Rodar `deploy_vps.py` várias vezes não quebra nada — ele recria os containers.
5. **Se o IP da VPS mudar**, atualize:
   - Registro A `api` no Cloudflare
   - Constante `HOST` no `deploy_vps.py`
   - Este documento
6. **Para debug avançado**, use `docker exec -it truck-backend sh` para entrar no container.
7. **O frontend na Vercel usa variáveis em build-time.** Alterar `.env` do frontend requer **novo commit + push** para refletir.

---

> **Dúvidas?** Consulte o `doc-deploy.md` para o guia rápido original, ou retorne a este documento para detalhes completos.

