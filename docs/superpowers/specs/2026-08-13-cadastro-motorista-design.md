# Cadastro de Motorista — Design

Data: 2026-08-13
Status: aprovado, pronto para plano de implementação

## Contexto

Hoje não existe módulo de motorista real. "Motorista" é apenas `UserOrmEntity`
com `role = DRIVER` (tabela `users`: id, name, email, passwordHash, role,
timestamps). Não há CPF, PIS, CNH, endereço, contatos de referência, PIX nem
status de aprovação.

No frontend (`front-end-truck`) existem duas telas divergentes e desconectadas
do backend (ambas mock, sem chamada HTTP real):
- `src/pages/Motoristas.tsx` — tela solta, campos `cpf/endereco/cnh/categoriaCnh`.
- `src/pages/AdminBaseOperacional.tsx` (aba "Motoristas", `DriverForm` +
  `driverFormSchema` em `src/lib/fleet-schemas.ts`) — hub CRUD real do admin,
  usa `driverService` mock via `useFleetCrud`.

Backend roda em VPS OVHcloud única (sem auto-scaling), não em Lambda —
`serverless.yml` no repo é config não usada atualmente. Disco local da VPS
persiste normalmente, então pode ser usado para armazenar imagem de CNH sem
depender de S3.

## Objetivo

Implementar cadastro completo de motorista (backend + frontend), com todos os
campos e validações da história de usuário, status de aprovação, log de
auditoria e upload de imagem de CNH.

## Decisões de escopo (confirmadas com o usuário)

- Aba única definitiva: `AdminBaseOperacional.tsx` → aba Motoristas. `Motoristas.tsx`
  standalone é removida.
- Escopo: backend + frontend integrados (frontend hoje é 100% mock, não persiste).
- Cadastro cria só **perfil** (sem login). Credenciais de acesso (`users` row)
  são criadas depois, em fluxo de ativação separado — fora do escopo deste
  cadastro.
- Status: `EM_ANALISE / APROVADO / REPROVADO`.
- CNH vencida: **não bloqueia** salvar — sistema calcula e retorna
  `cnh_expired: boolean`, admin decide na aprovação.
- Upload de imagem de CNH: disco local da VPS (sem S3), servido autenticado.
- Audit log: tabela própria, construído agora (não existia infra nenhuma).

## Modelo de dados

### `drivers`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→users, nullable, unique | populado só na ativação de login (fora de escopo) |
| full_name | varchar(150) | regex letras+espaços, min 5 chars |
| cpf | varchar(11) unique | validação de dígito verificador, formato+dígitos |
| pis | varchar(11) | validação de dígito verificador PIS/PASEP |
| address_street | varchar | obrigatório |
| address_number | varchar | obrigatório |
| address_complement | varchar nullable | opcional |
| address_neighborhood | varchar | obrigatório |
| address_city | varchar | obrigatório |
| address_state | varchar(2) | obrigatório |
| address_zip | varchar(8) | validado via ViaCEP (API pública gratuita) |
| cnh_number | varchar | obrigatório |
| cnh_category | enum A,B,C,D,E | obrigatório |
| cnh_expires_at | date | obrigatório |
| cnh_expired | computado (não persistido, calculado na leitura) | `cnh_expires_at < now()` |
| cnh_image_path | varchar nullable | path relativo em disco VPS |
| pix_key_type | enum CPF,CNPJ,EMAIL,PHONE,RANDOM | detectado automaticamente a partir da chave |
| pix_key | varchar | validado conforme `pix_key_type` |
| status | enum EM_ANALISE,APROVADO,REPROVADO | default EM_ANALISE |
| created_at / updated_at | timestamp | |

### `driver_reference_contacts`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| driver_id | uuid FK→drivers | |
| name | varchar | obrigatório |
| phone | varchar | DDD+número, regex BR |
| relationship | varchar | grau de relação |

Exatamente 3 contatos por motorista — validado na camada de aplicação
(não é constraint de banco), cadastro só conclui com os 3 preenchidos.

### `driver_audit_logs`
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| driver_id | uuid FK→drivers | |
| action | enum CREATED,UPDATED,STATUS_CHANGED | |
| actor_user_id | uuid FK→users | admin que executou a ação |
| payload_snapshot | jsonb | estado relevante no momento da ação |
| created_at | timestamp | |

## Validações

- **Nome completo**: obrigatório, só letras+espaços, min 5 caracteres.
- **CPF**: obrigatório, formato+dígito verificador, único no sistema (409 se duplicado).
- **PIS**: obrigatório, formato+dígito verificador.
- **Endereço**: campos mínimos obrigatórios, CEP validado (ViaCEP), complemento opcional.
- **CNH**: número+categoria+validade obrigatórios; vencida → aviso, não bloqueia; imagem opcional.
- **Contatos**: exatos 3, cada um com nome+telefone+grau, telefone validado (DDD+número).
- **PIX**: tipo detectado automaticamente pela forma da chave, validado conforme o tipo.
- Cadastro só salva se todos os campos obrigatórios estiverem preenchidos e válidos —
  erros retornam mensagem clara por campo.

## Módulo backend

Novo módulo `src/modules/drivers/`, seguindo o padrão dos módulos existentes
(`finance`, `payables`, `transactions`): `domain/` (entidades de domínio,
interfaces de repositório), `application/services/`, `infrastructure/repositories/`
(TypeORM), `presentation/controllers/` + `dtos/`.

### Endpoints
- `POST /drivers` — cria motorista, status inicial EM_ANALISE. Log CREATED.
- `GET /drivers` — lista paginada, filtrável por status.
- `GET /drivers/:id` — detalhe.
- `PATCH /drivers/:id` — edição de campos. Log UPDATED.
- `PATCH /drivers/:id/status` — aprova/reprova. Log STATUS_CHANGED.
- `POST /drivers/:id/cnh-image` — upload multipart (multer), salva em
  `uploads/drivers/cnh/{driverId}.{ext}` (path base configurável via env),
  fora do diretório de build da app.
- `GET /drivers/:id/cnh-image` — serve o arquivo, autenticado, só ADMIN.

Todos os endpoints protegidos por guard de ADMIN (padrão já usado no projeto,
ver `roles.guard.ts`).

## Frontend

- Remove `src/pages/Motoristas.tsx` (mock standalone, duplicado).
- Aba "Motoristas" de `AdminBaseOperacional.tsx` vira a tela única.
- `src/services/fleet/driver-service.ts`: troca mock repository por chamadas
  HTTP reais aos endpoints acima.
- `driverFormSchema` (`src/lib/fleet-schemas.ts`) ganha: CPF, PIS, endereço
  completo+CEP, CNH categoria+validade, 3 contatos de referência (array fixo
  len 3), PIX (tipo+chave). Validação client-side espelha as regras do
  backend para feedback imediato; backend permanece fonte de verdade.
- Upload de CNH: input file no form, enviado via `FormData` para o endpoint
  de upload após criar/editar o motorista.
- Badge de status (EM_ANALISE/APROVADO/REPROVADO); ação aprovar/reprovar
  visível só para ADMIN.

## Fora de escopo

- Fluxo de ativação de login do motorista (criação de `users` row,
  convite/senha) — feature separada, referenciada aqui só pelo `user_id`
  nullable em `drivers`.
- Storage em S3 — decisão explícita de usar disco da VPS por ora.
