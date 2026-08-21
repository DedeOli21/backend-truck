# Módulo de Abastecimento (Refuelings) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir abastecimentos no Postgres, fechando o chamado "abastecimentos não aparecem na listagem".

**Architecture:** Módulo `refuelings` no mesmo formato de `trucks` (entregue na leva 1): quatro camadas, repositório Postgres em produção e in-memory em teste, guards `JwtAuthGuard` + `RolesGuard`. A regra de acesso por papel vive no service, resolvida a partir de `req.user.sub`.

**Tech Stack:** NestJS 10, TypeORM, PostgreSQL, class-validator, Jest. Frontend React 18 + TanStack Query + Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-abastecimento-backend-design.md`
**Leva anterior:** `docs/superpowers/plans/2026-08-21-veiculos-backend.md` (padrões a copiar)

## Global Constraints

- Dinheiro em `numeric(n,2)`; litros e preço por litro em `numeric(10,3)`.
- Alias `@refuelings/*` em `tsconfig.json` e `jest.config.ts`.
- In-memory selecionado por `NODE_ENV === 'test'`.
- `total_amount` é gravado, não derivado. `price_per_liter` sai da divisão feita no cliente.
- ADMIN irrestrito; DRIVER só o próprio. A identidade do motorista **nunca** vem do corpo da requisição.
- `refuelings.driver_id` referencia `drivers(id)`, mas o JWT carrega `users.id` em `sub`. A tradução é obrigatória e é a peça que a leva 1 não tinha.

## Decisão que este plano fixa

O motorista logado precisa virar um `drivers.id`. Hoje não existe busca por `user_id` em lugar nenhum. Este plano adiciona `findByUserId` ao `DriversRepository` (porta + Postgres + in-memory) e o expõe como `DriversService.findIdByUserId(userId): Promise<string | null>`. `RefuelingsModule` importa `DriversModule`, que já exporta `DriversService`.

Um usuário com papel DRIVER sem linha correspondente em `drivers` recebe `403` com mensagem explícita — é um estado inconsistente de cadastro, não um erro do lançamento.

---

### Task 1: Busca de motorista por usuário

**Files:**
- Modify: `src/modules/drivers/domain/repositories/drivers.repository.ts`
- Modify: `src/modules/drivers/infrastructure/repositories/postgres-drivers.repository.ts`
- Modify: `src/modules/drivers/infrastructure/repositories/in-memory-drivers.repository.ts`
- Modify: `src/modules/drivers/application/services/drivers.service.ts`
- Test: `src/modules/drivers/application/services/drivers.service.spec.ts`

**Interfaces:**
- Produces: `DriversRepository.findByUserId(userId: string): Promise<DriverWithContacts | null>` e `DriversService.findIdByUserId(userId: string): Promise<string | null>`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao `drivers.service.spec.ts` existente:

```ts
  it('encontra o id do motorista pelo id do usuario vinculado', async () => {
    const created = await service.create(validDriverDto, 'admin-1');
    await service.defineDriverAccess(created.id, { userId: 'user-99' }, 'admin-1');

    await expect(service.findIdByUserId('user-99')).resolves.toBe(created.id);
  });

  it('devolve null quando nenhum motorista esta vinculado ao usuario', async () => {
    await expect(service.findIdByUserId('user-inexistente')).resolves.toBeNull();
  });
```

Conferir no arquivo o nome real da fixture de DTO e a assinatura de `defineDriverAccess` antes de colar.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest --runTestsByPath src/modules/drivers/application/services/drivers.service.spec.ts`
Expected: FAIL — `service.findIdByUserId is not a function`.

- [ ] **Step 3: Implementar**

Na porta:

```ts
  findByUserId(userId: string): Promise<DriverWithContacts | null>;
```

No `PostgresDriversRepository`, no mesmo formato do `findById` já existente:

```ts
  async findByUserId(userId: string): Promise<DriverWithContacts | null> {
    const row = await this.repository.findOne({ where: { userId } });
    return row ? this.toDomainWithContacts(row) : null;
  }
```

No `InMemoryDriversRepository`:

```ts
  async findByUserId(userId: string): Promise<DriverWithContacts | null> {
    return [...this.drivers.values()].find((item) => item.driver.userId === userId) ?? null;
  }
```

No `DriversService`:

```ts
  async findIdByUserId(userId: string): Promise<string | null> {
    const found = await this.driversRepository.findByUserId(userId);
    return found?.driver.id ?? null;
  }
```

Ajustar nomes de campos internos conforme o arquivo real.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS, sem regressão nos 66 testes atuais.

- [ ] **Step 5: Commit**

```bash
git add src/modules/drivers
git commit -m "feat(drivers): permite localizar motorista pelo usuario vinculado"
```

---

### Task 2: Migration e entidades

**Files:**
- Create: `src/database/typeorm/migrations/1760600000000-AddRefuelings.ts`
- Create: `src/database/typeorm/entities/refueling.orm-entity.ts`
- Modify: `src/database/typeorm/entities/index.ts`
- Create: `src/modules/refuelings/domain/entities/refueling.entity.ts`

**Interfaces:**
- Produces: tabela `refuelings`; `RefuelingOrmEntity`; `RefuelingEntity` com `id`, `truckId`, `driverId`, `liters`, `pricePerLiter`, `totalAmount`, `odometer`, `gasStationName`, `refueledAt`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefuelings1760600000000 implements MigrationInterface {
  name = 'AddRefuelings1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refuelings (
        id uuid PRIMARY KEY,
        truck_id uuid NOT NULL,
        driver_id uuid NOT NULL,
        liters numeric(10,3) NOT NULL,
        price_per_liter numeric(10,3) NOT NULL,
        total_amount numeric(12,2) NOT NULL,
        odometer integer NOT NULL,
        gas_station_name varchar(150),
        refueled_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_refuelings_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT,
        CONSTRAINT fk_refuelings_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT chk_refuelings_liters_positive CHECK (liters > 0),
        CONSTRAINT chk_refuelings_total_positive CHECK (total_amount > 0),
        CONSTRAINT chk_refuelings_odometer_non_negative CHECK (odometer >= 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_refuelings_truck_odometer ON refuelings (truck_id, odometer)`);
    await queryRunner.query(`CREATE INDEX idx_refuelings_driver ON refuelings (driver_id)`);
    await queryRunner.query(`CREATE INDEX idx_refuelings_refueled_at ON refuelings (refueled_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refuelings`);
  }
}
```

- [ ] **Step 2: Entidade ORM**

`src/database/typeorm/entities/refueling.orm-entity.ts`, com o mesmo `numericTransformer` usado em `truck.orm-entity.ts` para `liters`, `pricePerLiter` e `totalAmount`. Exportar em `entities/index.ts`.

- [ ] **Step 3: Entidade de domínio**

Igual em forma a `TruckEntity`: campos públicos e `constructor(props: Partial<RefuelingEntity>)`.

- [ ] **Step 4: Compilar e commitar**

Run: `npx tsc --noEmit -p tsconfig.json`

```bash
git add src/database/typeorm src/modules/refuelings
git commit -m "feat(refuelings): cria tabela e entidades de abastecimento"
```

---

### Task 3: Repositórios e DTOs

**Files:**
- Create: `src/modules/refuelings/domain/repositories/refuelings.repository.ts`
- Create: `src/modules/refuelings/infrastructure/repositories/in-memory-refuelings.repository.ts`
- Create: `src/modules/refuelings/infrastructure/repositories/postgres-refuelings.repository.ts`
- Create: `src/modules/refuelings/presentation/dtos/create-refueling.dto.ts`
- Create: `src/modules/refuelings/presentation/dtos/update-refueling.dto.ts`
- Create: `src/modules/refuelings/presentation/dtos/list-refuelings.query.ts`
- Modify: `tsconfig.json`, `jest.config.ts`

**Interfaces:**
- Produces: token `REFUELINGS_REPOSITORY`; `RefuelingsRepository` com `create`, `findById`, `list(filters)`, `update`, `remove`; `RefuelingFilters` (`truckId?`, `driverId?`, `from?`, `to?`).

- [ ] **Step 1: Porta com filtros**

```ts
export interface RefuelingFilters {
  truckId?: string;
  driverId?: string;
  from?: Date;
  to?: Date;
}
```

`list(filters: RefuelingFilters): Promise<RefuelingEntity[]>`, ordenado por `refueledAt` decrescente.

- [ ] **Step 2: In-memory** filtrando em memória pelos quatro campos.

- [ ] **Step 3: Postgres** com `QueryBuilder`, aplicando `andWhere` condicional por filtro e `orderBy('refueling.refueledAt', 'DESC')`.

- [ ] **Step 4: DTOs**

`CreateRefuelingDto`: `truckId` (`@IsUUID`), `driverId` (`@IsUUID`, `@IsOptional` — ignorado para DRIVER), `liters` (`@IsNumber`, `@IsPositive`), `totalAmount` (`@IsNumber`, `@IsPositive`), `odometer` (`@IsInt`, `@Min(0)`), `gasStationName` (`@IsOptional`, `@IsString`, `@Length(1,150)`), `refueledAt` (`@IsISO8601`).

`price_per_liter` **não** entra no DTO: é derivado de `totalAmount / liters` no service, que é a conta que a tela já faz.

`UpdateRefuelingDto extends PartialType(CreateRefuelingDto)`.

`ListRefuelingsQuery`: `truckId?`, `driverId?`, `from?`, `to?`, todos `@IsOptional`.

- [ ] **Step 5: Aliases e commit**

```bash
git add src/modules/refuelings tsconfig.json jest.config.ts
git commit -m "feat(refuelings): define repositorio e DTOs de abastecimento"
```

---

### Task 4: Service com as regras de acesso

**Files:**
- Create: `src/modules/refuelings/application/services/refuelings.service.ts`
- Test: `src/modules/refuelings/application/services/refuelings.service.spec.ts`

**Interfaces:**
- Consumes: `REFUELINGS_REPOSITORY`, `DriversService.findIdByUserId` (Task 1).
- Produces: `RefuelingsService` com `create(dto, actor)`, `list(query, actor)`, `findById(id, actor)`, `update(id, dto, actor)`, `remove(id, actor)`, onde `actor = { userId: string; role: 'ADMIN' | 'DRIVER' }`; e `RefuelingResponse` (`id`, `truckId`, `driverId`, `liters`, `pricePerLiter`, `totalAmount`, `odometer`, `gasStationName`, `refueledAt`, `createdAt`, `updatedAt`).

- [ ] **Step 1: Testes que falham**

Cobrir, com repositório in-memory e um `DriversService` dublê:

1. ADMIN cria informando `driverId` — grava o informado.
2. ADMIN sem `driverId` no corpo — `400`.
3. DRIVER cria — grava o `drivers.id` dele, **ignorando** o `driverId` do corpo (passar um id de outro motorista e conferir que não foi usado).
4. DRIVER sem cadastro em `drivers` — `403`.
5. `pricePerLiter` calculado: `totalAmount 700 / liters 100` = `7`.
6. ADMIN lista tudo; DRIVER lista só o próprio, mesmo passando `driverId` de outro na query.
7. Filtro por `truckId` e por intervalo `from`/`to`.
8. DRIVER editando registro de outro — `403`. Editando o próprio — ok.
9. DRIVER removendo registro de outro — `403`.
10. `NotFoundException` para id inexistente.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**, com um método privado `resolveDriverId(actor, dtoDriverId)` concentrando a regra:

```ts
  private async resolveDriverId(actor: Actor, dtoDriverId?: string): Promise<string> {
    if (actor.role === 'ADMIN') {
      if (!dtoDriverId) {
        throw new BadRequestException('Informe o motorista do abastecimento.');
      }
      return dtoDriverId;
    }

    const driverId = await this.driversService.findIdByUserId(actor.userId);

    if (!driverId) {
      throw new ForbiddenException('Seu usuário не está vinculado a um motorista.');
    }

    return driverId;
  }
```

Atenção: a linha acima contém um erro proposital de digitação (`не`) para ser corrigido — escrever "não". Verificar acentuação de todas as mensagens ao implementar.

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit**

```bash
git add src/modules/refuelings/application
git commit -m "feat(refuelings): implementa regras de lancamento por papel"
```

---

### Task 5: Controller, módulo e verificação

**Files:**
- Create: `src/modules/refuelings/presentation/controllers/refuelings.controller.ts`
- Create: `src/modules/refuelings/refuelings.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Controller** com `@Roles('ADMIN', 'DRIVER')` na classe (a restrição fina é do service, não do guard), repassando `{ userId: req.user.sub, role: req.user.role }` em todos os métodos. `DELETE` com `@HttpCode(204)`.

- [ ] **Step 2: Módulo** importando `AuthModule`, `DriversModule` e `TypeOrmModule.forFeature([RefuelingOrmEntity])` fora de teste. Registrar em `app.module.ts`.

- [ ] **Step 3: Suíte completa**

Run: `npm test`

- [ ] **Step 4: Boot local e exercício das rotas**

Run: `NODE_ENV=test JWT_SECRET=dev JWT_REFRESH_SECRET=dev PORT=3999 npx ts-node -r tsconfig-paths/register src/main.ts`
Expected: `/refuelings` mapeado em POST, GET, GET/:id, PATCH/:id, DELETE/:id.

Exercitar com token de ADMIN: criar, listar, filtrar por `truckId`, editar e remover.

- [ ] **Step 5: Commit**

```bash
git add src/modules/refuelings src/app.module.ts
git commit -m "feat(refuelings): expoe endpoints REST de abastecimento"
```

---

### Task 6: Frontend — service real e tela do motorista

**Files:**
- Modify: `front-end-truck/src/types/api.ts`
- Modify: `front-end-truck/src/services/fleet/refueling-service.ts`
- Modify: `front-end-truck/src/components/app/AdminAbastecimento.tsx`
- Modify: `front-end-truck/src/components/app/DriverAbastecimento.tsx`
- Modify: `front-end-truck/src/services/fleet/seed.ts`
- Test: `front-end-truck/src/services/fleet/refueling-service.test.ts`

- [ ] **Step 1: Teste do service** no molde de `vehicle-service.test.ts`: mapeamento da resposta, envio de `totalAmount` em vez de `pricePerLiter`, PATCH parcial, DELETE.

- [ ] **Step 2: Implementar o service** sobre `/refuelings`, removendo `refuelingsSeed`.

- [ ] **Step 3: Ajustar `AdminAbastecimento`** — o submit passa a enviar `totalAmount` e `refueledAt` em ISO. O cálculo de `pricePerLiter` sai do frontend, que hoje divide antes de enviar.

- [ ] **Step 4: Ligar `DriverAbastecimento`**, que é o defeito ainda aberto do chamado original. O motorista não escolhe motorista (vem do token) e precisa escolher o veículo: adicionar um `Select` alimentado por `vehicleService.getVehicles()`.

- [ ] **Step 5: Verificar**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npx vite build`

- [ ] **Step 6: Commit e PR.**

---

### Task 7: Deploy e validação em produção

- [ ] **Step 1: Deploy**

Run: `python3 deploy_vps_incremental.py`
Expected: migration `AddRefuelings1760600000000` na lista de aplicadas.

- [ ] **Step 2: Backup antes** — `docker exec truck-postgres pg_dump -U truck_admin -d truckdb > ~/backups/truckdb-pre-refuelings-$(date +%Y%m%d-%H%M%S).sql`

- [ ] **Step 3: Exercitar a API de produção** com token de ADMIN: criar abastecimento para um veículo real, conferir `price_per_liter` no banco, listar, filtrar, remover o registro de teste.

- [ ] **Step 4: Conferir que `/drivers`, `/driver-payments`, `/trucks` e `/payables` seguem em 200** e que o log do container não tem erro.
