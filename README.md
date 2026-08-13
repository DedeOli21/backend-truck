# 🚛 Backend Truck — Gestão de Transporte e Logística

> API REST do sistema **AMW Transporte**, responsável por autenticação, controle financeiro, gestão de fretes, abastecimento e contas a pagar para motoristas e administradores de transporte.

🔗 **Repositório Frontend:** [github.com/DedeOli21/frontend-truck](https://github.com/DedeOli21/frontend-truck)

---

## 📦 O que é este projeto?

Este é o **backend (API)** de um sistema completo de gestão para empresas de transporte e motoristas autônomos. Ele expõe endpoints REST protegidos por JWT, com controle de acesso por roles (`ADMIN`, `DRIVER`), e gerencia todo o fluxo financeiro do dia a dia do transporte:

- Cadastro e login de usuários
- Registro de entradas (fretes) e saídas (combustível, despesas)
- Controle de saldo em carteira
- Contas a pagar com vencimento
- Sincronização com saldo bancário (Open Banking simulado)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Runtime** | Node.js | 20+ |
| **Framework** | NestJS | 10 |
| **Linguagem** | TypeScript | 5 |
| **Banco de Dados** | PostgreSQL | 15 |
| **ORM** | TypeORM | 0.3+ |
| **Autenticação** | JWT + Passport | — |
| **Testes** | Jest + Supertest | — |
| **Qualidade** | ESLint + TypeScript strict | — |
| **Containerização** | Docker + Docker Compose | — |
| **Infraestrutura** | VPS OVHcloud + Nginx + Cloudflare + Vercel | — |

---

## 🚀 Infraestrutura & Deploy

A aplicação roda em produção em uma **VPS OVHcloud** com Docker Compose.

### Arquitetura de deploy

```
Internet → Cloudflare DNS → VPS OVHcloud (40.160.82.252)
                                    │
                                    ├── Nginx (:80) → Backend NestJS (:3000)
                                    └── PostgreSQL (:5432, rede interna Docker)
```

### Ambientes

| Ambiente | URL | Plataforma |
|----------|-----|------------|
| **Produção (temporário)** | `https://xxx.trycloudflare.com` | Cloudflare Tunnel |
| **Produção (futuro)** | `https://api.amw-transporte.com.br` | Cloudflare + VPS |
| **Frontend** | `https://front-end-truck.vercel.app` | Vercel |

📖 **Documentação completa da infraestrutura:** veja [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md)

### Deploy automatizado

```bash
# Da máquina local — envia código, builda e sobe containers na VPS
cd /home/david/projeto-freela/backend-truck
python3 deploy_vps.py
```

---

## Arquitetura

Estrutura por domínio, com camadas:

- `presentation` (controllers, dtos)
- `application` (services / casos de uso)
- `domain` (entities, contratos)
- `infrastructure` (repositórios, persistência)

Módulos atuais:

- `auth`
- `transactions`
- `finance`
- `payables`

## Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Configuração de ambiente

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Ajuste as variáveis no `.env`:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

## Instalação

```bash
npm install
```

## Banco de dados e migrations

Migration inicial já criada.

```bash
npm run migration:run
```

Comandos úteis:

```bash
npm run migration:create
npm run migration:generate
npm run migration:revert
```

## Rodando a aplicação

### Modo Nest (local)

```bash
npm run start:dev
```

Base URL padrão: `http://localhost:3000`

### Modo Serverless Offline (simula API Gateway + Lambda)

```bash
npm run offline
```

Base URL padrão: `http://localhost:3000`

## Swagger (OpenAPI)

Documentacao interativa:

- http://localhost:3000/docs

Documento OpenAPI em JSON:

- http://localhost:3000/docs-json

Como autenticar no Swagger:

1. Faca POST /auth/login
2. Copie o ccessToken
3. Clique em **Authorize** no Swagger
4. Informe: Bearer <accessToken>

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

## Autenticação e autorização

- Autenticação via JWT Bearer token
- RBAC com roles:
  - `ADMIN`
  - `DRIVER`

Header padrão para rotas protegidas:

```http
Authorization: Bearer <accessToken>
```

## Rotas

### Auth

#### `POST /auth/register`
Cria usuário.

Body:

```json
{
  "name": "Administrador",
  "email": "admin@empresa.com",
  "password": "123456",
  "role": "ADMIN"
}
```

Resposta (201):

```json
{
  "id": "uuid",
  "name": "Administrador",
  "email": "admin@empresa.com",
  "role": "ADMIN"
}
```

#### `POST /auth/login`
Autentica usuário e retorna tokens.

Body:

```json
{
  "email": "admin@empresa.com",
  "password": "123456"
}
```

Resposta (201):

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

#### `POST /auth/refresh`
Gera novo par de tokens usando refresh token.

Body:

```json
{
  "refreshToken": "..."
}
```

---

### Transactions (protegido: `ADMIN`, `DRIVER`)

#### `GET /transactions`
Retorna extrato do usuário autenticado.

#### `POST /transactions/freight`
Registra entrada de frete.

Body:

```json
{
  "amount": 1500,
  "description": "Frete São Paulo"
}
```

#### `POST /transactions/fuel`
Registra saída de combustível.

Body:

```json
{
  "amount": 300,
  "description": "Abastecimento BR"
}
```

Regras:

- não permite saída com saldo insuficiente

---

### Finance

#### `GET /finance/balance` (protegido: `ADMIN`, `DRIVER`)
Retorna saldo consolidado.

Resposta exemplo:

```json
{
  "walletBalance": 1200,
  "openBankingBalance": 500,
  "totalAvailable": 1700
}
```

#### `POST /finance/open-banking/sync` (protegido: `ADMIN`)
Sincroniza saldo externo (Open Banking simulado).

Body:

```json
{
  "provider": "Banco Parceiro",
  "availableBalance": 500
}
```

---

### Payables (protegido: `ADMIN`, `DRIVER`)

#### `GET /payables`
Lista contas urgentes pendentes.

#### `PATCH /payables/:id/pay`
Baixa conta a pagar:

- marca `PAID`
- cria transação de saída
- vincula `transactionId`
- debita saldo da carteira de forma transacional

Regras:

- não permite pagamento com saldo insuficiente

## Exemplos rápidos com cURL

### 1) Registrar + Login

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@empresa.com","password":"123456","role":"ADMIN"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"123456"}'
```

### 2) Criar frete

```bash
curl -X POST http://localhost:3000/transactions/freight \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount":1500,"description":"Frete Curitiba"}'
```

### 3) Pagar boleto

```bash
curl -X PATCH http://localhost:3000/payables/<PAYABLE_ID>/pay \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 🐳 Docker (produção)

Para rodar localmente com Docker Compose (simula produção):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Containers:
- `truck-postgres` — PostgreSQL 15
- `truck-backend` — NestJS compilado
- `truck-nginx` — Reverse proxy na porta 80

---

## Observações importantes

- Em ambiente de teste (`NODE_ENV=test`), parte dos módulos usa repositórios in-memory para testes rápidos.
- Em ambientes normais, usa PostgreSQL via TypeORM.
- Para produção na VPS, utilize `deploy_vps.py` ou siga o guia em [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md).

## Deploy Serverless

```bash
npm run sls:deploy
```

Remover stack:

```bash
npm run sls:remove
```

---

## 👤 Autor

**David (DedeOli21)** — [GitHub](https://github.com/DedeOli21)

## 📄 Licença

Este projeto é privado e de uso exclusivo da AMW Transporte.
