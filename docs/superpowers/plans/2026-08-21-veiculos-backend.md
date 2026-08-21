# Módulo de Veículos (Trucks) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor CRUD real de veículos sobre a tabela `trucks`, substituindo o mock de veículos do frontend e destravando os módulos de abastecimento e gasto variável.

**Architecture:** Módulo NestJS irmão de `drivers`, com as quatro camadas do repo (`domain`, `application`, `infrastructure`, `presentation`), repositório Postgres em produção e in-memory em teste, guards `JwtAuthGuard` + `RolesGuard`. Uma migration amplia `trucks` com `type`, `capacity` e `status`, e corrige a FK `driver_id` para apontar a `drivers`. No frontend, `vehicleService` mantém a assinatura atual e troca `createMockRepository` por `apiRequest`.

**Tech Stack:** NestJS 10, TypeORM, PostgreSQL, class-validator, Jest (backend). React 18, Vite, TanStack Query, Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-08-21-abastecimento-backend-design.md`

## Global Constraints

- Dinheiro e medidas decimais em `numeric(n,2)`, nunca centavos em `integer`.
- Path aliases obrigatórios: `@trucks/*` deve ser registrado em `tsconfig.json` e em `jest.config.ts` (`moduleNameMapper`), no mesmo formato de `@drivers/*`.
- Repositório in-memory é selecionado por `process.env.NODE_ENV === 'test'`, como em `drivers.module.ts`.
- `type` aceita exatamente `TRUCK | CARRETA | BITREM | VAN`. `status` aceita exatamente `ATIVO | MANUTENCAO | INATIVO`.
- Placa é única; violação retorna `409 Conflict`, nunca 500.
- Todas as rotas exigem JWT. `@Roles('ADMIN')` em tudo, exceto `GET /trucks`, liberado também para `DRIVER`.
- Timestamps trafegam em ISO 8601 (`toISOString()`), como em `DriverResponse`.
- Commits em português, formato Conventional Commits, direto na `main` (autorizado pelo usuário).

---

### Task 1: Enums e migration

**Files:**
- Modify: `src/database/typeorm/entities/enums.ts`
- Create: `src/database/typeorm/migrations/1760500000000-AddTruckDetails.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `TruckType` e `TruckStatus` (enums TypeScript), colunas `type`, `capacity`, `status` em `trucks`, FK `fk_trucks_driver` referenciando `drivers(id)`.

- [ ] **Step 1: Adicionar os enums**

Ao final de `src/database/typeorm/entities/enums.ts`:

```ts
export enum TruckType {
  TRUCK = 'TRUCK',
  CARRETA = 'CARRETA',
  BITREM = 'BITREM',
  VAN = 'VAN',
}

export enum TruckStatus {
  ATIVO = 'ATIVO',
  MANUTENCAO = 'MANUTENCAO',
  INATIVO = 'INATIVO',
}
```

- [ ] **Step 2: Escrever a migration**

Criar `src/database/typeorm/migrations/1760500000000-AddTruckDetails.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTruckDetails1760500000000 implements MigrationInterface {
  name = 'AddTruckDetails1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN type varchar(20) NOT NULL DEFAULT 'TRUCK'`);
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN capacity numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ATIVO'`);

    // driver_id apontava para users(id); os motoristas vivem em drivers.
    // Zera o que não existir em drivers para a nova FK poder ser criada.
    await queryRunner.query(`ALTER TABLE trucks DROP CONSTRAINT IF EXISTS fk_trucks_driver`);
    await queryRunner.query(`
      UPDATE trucks
      SET driver_id = NULL
      WHERE driver_id IS NOT NULL
        AND driver_id NOT IN (SELECT id FROM drivers)
    `);
    await queryRunner.query(`
      ALTER TABLE trucks
      ADD CONSTRAINT fk_trucks_driver
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trucks DROP CONSTRAINT IF EXISTS fk_trucks_driver`);
    await queryRunner.query(`
      UPDATE trucks
      SET driver_id = NULL
      WHERE driver_id IS NOT NULL
        AND driver_id NOT IN (SELECT id FROM users)
    `);
    await queryRunner.query(`
      ALTER TABLE trucks
      ADD CONSTRAINT fk_trucks_driver
      FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS capacity`);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS type`);
  }
}
```

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/database/typeorm/entities/enums.ts src/database/typeorm/migrations/1760500000000-AddTruckDetails.ts
git commit -m "feat(trucks): amplia tabela de veiculos com tipo, capacidade e status"
```

---

### Task 2: Entidade ORM e entidade de domínio

**Files:**
- Modify: `src/database/typeorm/entities/truck.orm-entity.ts`
- Create: `src/modules/trucks/domain/entities/truck.entity.ts`

**Interfaces:**
- Consumes: `TruckType`, `TruckStatus` da Task 1.
- Produces: `TruckOrmEntity` com os campos novos; `TruckEntity` com o construtor `new TruckEntity({...})` e as propriedades `id`, `plate`, `rntrc`, `brandModel`, `year`, `type`, `capacity`, `status`, `driverId`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Adicionar as colunas na entidade ORM**

Em `src/database/typeorm/entities/truck.orm-entity.ts`, depois de `year`, e trocando o `ManyToOne` de `UserOrmEntity` para `DriverOrmEntity`:

```ts
  @Column({ type: 'varchar', length: 20, default: TruckType.TRUCK })
  type!: TruckType;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  capacity!: number;

  @Column({ type: 'varchar', length: 20, default: TruckStatus.ATIVO })
  status!: TruckStatus;
```

`numericTransformer` converte o `string` que o driver do Postgres devolve para `number`:

```ts
const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};
```

O `@ManyToOne(() => UserOrmEntity, ...)` e o `driver!: UserOrmEntity | null` passam a apontar para `DriverOrmEntity`. Manter `driverId` como está.

- [ ] **Step 2: Criar a entidade de domínio**

`src/modules/trucks/domain/entities/truck.entity.ts`:

```ts
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';

export class TruckEntity {
  id!: string;
  plate!: string;
  rntrc!: string | null;
  brandModel!: string;
  year!: number | null;
  type!: TruckType;
  capacity!: number;
  status!: TruckStatus;
  driverId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<TruckEntity>) {
    Object.assign(this, props);
  }
}
```

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/database/typeorm/entities/truck.orm-entity.ts src/modules/trucks/domain/entities/truck.entity.ts
git commit -m "feat(trucks): adiciona entidade de dominio do veiculo"
```

---

### Task 3: Porta do repositório e implementação in-memory

**Files:**
- Create: `src/modules/trucks/domain/repositories/trucks.repository.ts`
- Create: `src/modules/trucks/infrastructure/repositories/in-memory-trucks.repository.ts`

**Interfaces:**
- Consumes: `TruckEntity` da Task 2.
- Produces: token `TRUCKS_REPOSITORY`; interface `TrucksRepository` com `create`, `findById`, `findByPlate`, `list`, `update`, `remove`; classe `InMemoryTrucksRepository`.

- [ ] **Step 1: Escrever a porta**

`src/modules/trucks/domain/repositories/trucks.repository.ts`:

```ts
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';

export const TRUCKS_REPOSITORY = 'TRUCKS_REPOSITORY';

export interface TrucksRepository {
  create(truck: TruckEntity): Promise<TruckEntity>;
  findById(id: string): Promise<TruckEntity | null>;
  findByPlate(plate: string): Promise<TruckEntity | null>;
  list(status?: TruckStatus): Promise<TruckEntity[]>;
  update(id: string, truck: TruckEntity): Promise<TruckEntity>;
  remove(id: string): Promise<void>;
}
```

- [ ] **Step 2: Escrever o repositório in-memory**

`src/modules/trucks/infrastructure/repositories/in-memory-trucks.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TrucksRepository } from '@trucks/domain/repositories/trucks.repository';

@Injectable()
export class InMemoryTrucksRepository implements TrucksRepository {
  private readonly trucks = new Map<string, TruckEntity>();

  async create(truck: TruckEntity): Promise<TruckEntity> {
    this.trucks.set(truck.id, truck);
    return truck;
  }

  async findById(id: string): Promise<TruckEntity | null> {
    return this.trucks.get(id) ?? null;
  }

  async findByPlate(plate: string): Promise<TruckEntity | null> {
    return [...this.trucks.values()].find((truck) => truck.plate === plate) ?? null;
  }

  async list(status?: TruckStatus): Promise<TruckEntity[]> {
    const all = [...this.trucks.values()];
    return status ? all.filter((truck) => truck.status === status) : all;
  }

  async update(id: string, truck: TruckEntity): Promise<TruckEntity> {
    this.trucks.set(id, truck);
    return truck;
  }

  async remove(id: string): Promise<void> {
    this.trucks.delete(id);
  }
}
```

- [ ] **Step 3: Registrar o alias `@trucks/*`**

Em `tsconfig.json`, dentro de `compilerOptions.paths`, depois de `"@drivers/*"`:

```json
      "@trucks/*": ["src/modules/trucks/*"],
```

Em `jest.config.ts`, dentro de `moduleNameMapper`, depois de `@drivers`:

```ts
    '^@trucks/(.*)$': '<rootDir>/src/modules/trucks/$1',
```

- [ ] **Step 4: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json jest.config.ts src/modules/trucks/domain/repositories/trucks.repository.ts src/modules/trucks/infrastructure/repositories/in-memory-trucks.repository.ts
git commit -m "feat(trucks): define porta do repositorio de veiculos"
```

---

### Task 4: DTOs

**Files:**
- Create: `src/modules/trucks/presentation/dtos/create-truck.dto.ts`
- Create: `src/modules/trucks/presentation/dtos/update-truck.dto.ts`

**Interfaces:**
- Consumes: `TruckType`, `TruckStatus` da Task 1.
- Produces: `CreateTruckDto` (`plate`, `brandModel`, `year?`, `rntrc?`, `type`, `capacity`, `status?`, `driverId?`) e `UpdateTruckDto` (todos opcionais).

- [ ] **Step 1: Escrever o CreateTruckDto**

`src/modules/trucks/presentation/dtos/create-truck.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';

export class CreateTruckDto {
  @ApiProperty({ example: 'ABC1D23' })
  @IsString()
  @Length(7, 8)
  plate!: string;

  @ApiProperty({ example: 'Volvo FH 540' })
  @IsString()
  @Length(2, 120)
  brandModel!: string;

  @ApiPropertyOptional({ example: 2021 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  year?: number;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  rntrc?: string;

  @ApiProperty({ enum: TruckType, example: TruckType.TRUCK })
  @IsEnum(TruckType)
  type!: TruckType;

  @ApiProperty({ example: 14, description: 'Capacidade em toneladas' })
  @IsNumber()
  @IsPositive()
  capacity!: number;

  @ApiPropertyOptional({ enum: TruckStatus, example: TruckStatus.ATIVO })
  @IsOptional()
  @IsEnum(TruckStatus)
  status?: TruckStatus;

  @ApiPropertyOptional({ example: '2f1c7f1e-0d5a-4f7e-9d3b-0c1a2b3c4d5e' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
```

- [ ] **Step 2: Escrever o UpdateTruckDto**

`src/modules/trucks/presentation/dtos/update-truck.dto.ts`:

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';

export class UpdateTruckDto extends PartialType(CreateTruckDto) {}
```

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/trucks/presentation/dtos
git commit -m "feat(trucks): adiciona DTOs de cadastro e edicao de veiculo"
```

---

### Task 5: Service com testes

**Files:**
- Create: `src/modules/trucks/application/services/trucks.service.ts`
- Test: `src/modules/trucks/application/services/trucks.service.spec.ts`

**Interfaces:**
- Consumes: `TRUCKS_REPOSITORY`, `TrucksRepository` (Task 3); `CreateTruckDto`, `UpdateTruckDto` (Task 4); `TruckEntity` (Task 2).
- Produces: `TrucksService` com `create(dto): Promise<TruckResponse>`, `list(status?): Promise<TruckResponse[]>`, `findById(id): Promise<TruckResponse>`, `update(id, dto): Promise<TruckResponse>`, `remove(id): Promise<void>`; e a interface `TruckResponse` (`id`, `plate`, `rntrc`, `brandModel`, `year`, `type`, `capacity`, `status`, `driverId`, `createdAt`, `updatedAt`), consumida pelo controller e espelhada no frontend.

- [ ] **Step 1: Escrever o teste que falha**

`src/modules/trucks/application/services/trucks.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { InMemoryTrucksRepository } from '@trucks/infrastructure/repositories/in-memory-trucks.repository';

const baseDto = {
  plate: 'ABC1D23',
  brandModel: 'Volvo FH 540',
  year: 2021,
  type: TruckType.TRUCK,
  capacity: 14,
};

describe('TrucksService', () => {
  let repository: InMemoryTrucksRepository;
  let service: TrucksService;

  beforeEach(() => {
    repository = new InMemoryTrucksRepository();
    service = new TrucksService(repository);
  });

  it('cria veiculo com status ATIVO por padrao', async () => {
    const truck = await service.create({ ...baseDto });

    expect(truck.id).toBeDefined();
    expect(truck.plate).toBe('ABC1D23');
    expect(truck.status).toBe(TruckStatus.ATIVO);
    expect(truck.capacity).toBe(14);
  });

  it('normaliza a placa para maiusculas sem espacos', async () => {
    const truck = await service.create({ ...baseDto, plate: ' abc1d23 ' });
    expect(truck.plate).toBe('ABC1D23');
  });

  it('rejeita placa duplicada com ConflictException', async () => {
    await service.create({ ...baseDto });
    await expect(service.create({ ...baseDto })).rejects.toBeInstanceOf(ConflictException);
  });

  it('lista todos os veiculos e filtra por status', async () => {
    await service.create({ ...baseDto });
    await service.create({ ...baseDto, plate: 'XYZ4E56', status: TruckStatus.MANUTENCAO });

    expect(await service.list()).toHaveLength(2);
    const emManutencao = await service.list(TruckStatus.MANUTENCAO);
    expect(emManutencao).toHaveLength(1);
    expect(emManutencao[0].plate).toBe('XYZ4E56');
  });

  it('atualiza apenas os campos enviados', async () => {
    const created = await service.create({ ...baseDto });
    const updated = await service.update(created.id, { status: TruckStatus.INATIVO });

    expect(updated.status).toBe(TruckStatus.INATIVO);
    expect(updated.plate).toBe('ABC1D23');
    expect(updated.brandModel).toBe('Volvo FH 540');
  });

  it('rejeita atualizacao para placa ja usada por outro veiculo', async () => {
    await service.create({ ...baseDto });
    const outro = await service.create({ ...baseDto, plate: 'XYZ4E56' });

    await expect(service.update(outro.id, { plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('permite atualizacao mantendo a propria placa', async () => {
    const created = await service.create({ ...baseDto });
    const updated = await service.update(created.id, { plate: 'ABC1D23', capacity: 20 });
    expect(updated.capacity).toBe(20);
  });

  it('lanca NotFoundException ao buscar, atualizar ou remover id inexistente', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    await expect(service.findById(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(id, { capacity: 10 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove o veiculo', async () => {
    const created = await service.create({ ...baseDto });
    await service.remove(created.id);
    expect(await service.list()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx jest src/modules/trucks --runTestsByPath src/modules/trucks/application/services/trucks.service.spec.ts`
Expected: FAIL — `Cannot find module '@trucks/application/services/trucks.service'`.

- [ ] **Step 3: Implementar o service**

`src/modules/trucks/application/services/trucks.service.ts`:

```ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TRUCKS_REPOSITORY, TrucksRepository } from '@trucks/domain/repositories/trucks.repository';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';
import { UpdateTruckDto } from '@trucks/presentation/dtos/update-truck.dto';

export interface TruckResponse {
  id: string;
  plate: string;
  rntrc: string | null;
  brandModel: string;
  year: number | null;
  type: TruckType;
  capacity: number;
  status: TruckStatus;
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}

const normalizePlate = (plate: string) => plate.trim().toUpperCase().replace(/\s|-/g, '');

@Injectable()
export class TrucksService {
  constructor(@Inject(TRUCKS_REPOSITORY) private readonly trucksRepository: TrucksRepository) {}

  private toResponse(truck: TruckEntity): TruckResponse {
    return {
      id: truck.id,
      plate: truck.plate,
      rntrc: truck.rntrc ?? null,
      brandModel: truck.brandModel,
      year: truck.year ?? null,
      type: truck.type,
      capacity: Number(truck.capacity),
      status: truck.status,
      driverId: truck.driverId ?? null,
      createdAt: truck.createdAt.toISOString(),
      updatedAt: truck.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateTruckDto): Promise<TruckResponse> {
    const plate = normalizePlate(dto.plate);

    if (await this.trucksRepository.findByPlate(plate)) {
      throw new ConflictException('Já existe um veículo com essa placa.');
    }

    const now = new Date();
    const truck = new TruckEntity({
      id: randomUUID(),
      plate,
      rntrc: dto.rntrc ?? null,
      brandModel: dto.brandModel.trim(),
      year: dto.year ?? null,
      type: dto.type,
      capacity: dto.capacity,
      status: dto.status ?? TruckStatus.ATIVO,
      driverId: dto.driverId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.trucksRepository.create(truck));
  }

  async list(status?: TruckStatus): Promise<TruckResponse[]> {
    const trucks = await this.trucksRepository.list(status);
    return trucks.map((truck) => this.toResponse(truck));
  }

  private async getOrFail(id: string): Promise<TruckEntity> {
    const truck = await this.trucksRepository.findById(id);

    if (!truck) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return truck;
  }

  async findById(id: string): Promise<TruckResponse> {
    return this.toResponse(await this.getOrFail(id));
  }

  async update(id: string, dto: UpdateTruckDto): Promise<TruckResponse> {
    const current = await this.getOrFail(id);

    if (dto.plate !== undefined) {
      const plate = normalizePlate(dto.plate);
      const existing = await this.trucksRepository.findByPlate(plate);

      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe um veículo com essa placa.');
      }
    }

    const updated = new TruckEntity({
      ...current,
      plate: dto.plate === undefined ? current.plate : normalizePlate(dto.plate),
      rntrc: dto.rntrc === undefined ? current.rntrc : dto.rntrc,
      brandModel: dto.brandModel === undefined ? current.brandModel : dto.brandModel.trim(),
      year: dto.year === undefined ? current.year : dto.year,
      type: dto.type ?? current.type,
      capacity: dto.capacity ?? current.capacity,
      status: dto.status ?? current.status,
      driverId: dto.driverId === undefined ? current.driverId : dto.driverId,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.trucksRepository.update(id, updated));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.trucksRepository.remove(id);
  }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx jest --runTestsByPath src/modules/trucks/application/services/trucks.service.spec.ts`
Expected: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/modules/trucks/application
git commit -m "feat(trucks): implementa regras de cadastro e edicao de veiculo"
```

---

### Task 6: Repositório Postgres

**Files:**
- Create: `src/modules/trucks/infrastructure/repositories/postgres-trucks.repository.ts`

**Interfaces:**
- Consumes: `TrucksRepository`, `TruckEntity`, `TruckOrmEntity`.
- Produces: `PostgresTrucksRepository`.

- [ ] **Step 1: Implementar o repositório**

`src/modules/trucks/infrastructure/repositories/postgres-trucks.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TrucksRepository } from '@trucks/domain/repositories/trucks.repository';

@Injectable()
export class PostgresTrucksRepository implements TrucksRepository {
  constructor(
    @InjectRepository(TruckOrmEntity)
    private readonly repository: Repository<TruckOrmEntity>,
  ) {}

  private toDomain(row: TruckOrmEntity): TruckEntity {
    return new TruckEntity({
      id: row.id,
      plate: row.plate,
      rntrc: row.rntrc,
      brandModel: row.brandModel,
      year: row.year,
      type: row.type,
      capacity: Number(row.capacity),
      status: row.status,
      driverId: row.driverId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(truck: TruckEntity): Promise<TruckEntity> {
    const row = this.repository.create({
      id: truck.id,
      plate: truck.plate,
      rntrc: truck.rntrc,
      brandModel: truck.brandModel,
      year: truck.year,
      type: truck.type,
      capacity: truck.capacity,
      status: truck.status,
      driverId: truck.driverId,
    });

    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string): Promise<TruckEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByPlate(plate: string): Promise<TruckEntity | null> {
    const row = await this.repository.findOne({ where: { plate } });
    return row ? this.toDomain(row) : null;
  }

  async list(status?: TruckStatus): Promise<TruckEntity[]> {
    const rows = await this.repository.find({
      where: status ? { status } : {},
      order: { plate: 'ASC' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, truck: TruckEntity): Promise<TruckEntity> {
    await this.repository.update(id, {
      plate: truck.plate,
      rntrc: truck.rntrc,
      brandModel: truck.brandModel,
      year: truck.year,
      type: truck.type,
      capacity: truck.capacity,
      status: truck.status,
      driverId: truck.driverId,
    });

    const row = await this.repository.findOneOrFail({ where: { id } });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
```

- [ ] **Step 2: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/modules/trucks/infrastructure/repositories/postgres-trucks.repository.ts
git commit -m "feat(trucks): implementa repositorio postgres de veiculos"
```

---

### Task 7: Controller e módulo

**Files:**
- Create: `src/modules/trucks/presentation/controllers/trucks.controller.ts`
- Create: `src/modules/trucks/trucks.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `TrucksService` (Task 5), `PostgresTrucksRepository` (Task 6), `InMemoryTrucksRepository` (Task 3).
- Produces: rotas `/trucks`; `TrucksModule` exportando `TrucksService` para os módulos de abastecimento e gasto variável (planos seguintes).

- [ ] **Step 1: Escrever o controller**

`src/modules/trucks/presentation/controllers/trucks.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';
import { UpdateTruckDto } from '@trucks/presentation/dtos/update-truck.dto';

@ApiTags('Trucks')
@ApiBearerAuth('access-token')
@Controller('trucks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TrucksController {
  constructor(@Inject(TrucksService) private readonly trucksService: TrucksService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar veículo' })
  async create(@Body() dto: CreateTruckDto) {
    return this.trucksService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'DRIVER')
  @ApiOperation({ summary: 'Listar veículos' })
  async list(
    @Query('status', new ParseEnumPipe(TruckStatus, { optional: true })) status?: TruckStatus,
  ) {
    return this.trucksService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar veículo' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.trucksService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar veículo' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTruckDto) {
    return this.trucksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover veículo' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.trucksService.remove(id);
  }
}
```

`Roles` já aceita múltiplos papéis (`(...roles: Array<'ADMIN' | 'DRIVER'>)`) e o `RolesGuard` resolve com `getAllAndOverride`, então o `@Roles('ADMIN', 'DRIVER')` no método sobrepõe o `@Roles('ADMIN')` da classe. Nada a ajustar.

- [ ] **Step 2: Escrever o módulo**

`src/modules/trucks/trucks.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { TRUCKS_REPOSITORY } from '@trucks/domain/repositories/trucks.repository';
import { InMemoryTrucksRepository } from '@trucks/infrastructure/repositories/in-memory-trucks.repository';
import { PostgresTrucksRepository } from '@trucks/infrastructure/repositories/postgres-trucks.repository';
import { TrucksController } from '@trucks/presentation/controllers/trucks.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([TruckOrmEntity])])],
  controllers: [TrucksController],
  providers: [
    TrucksService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: TRUCKS_REPOSITORY,
      useClass: isTest ? InMemoryTrucksRepository : PostgresTrucksRepository,
    },
  ],
  exports: [TrucksService],
})
export class TrucksModule {}
```

- [ ] **Step 3: Registrar em `app.module.ts`**

Importar `TrucksModule` e incluí-lo no array `imports`, logo depois de `DriversModule`.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS, incluindo os 9 testes de `trucks.service.spec.ts` e nenhuma regressão.

- [ ] **Step 5: Subir a aplicação e conferir as rotas**

Run: `npm run build && node -e "require('./dist/main.js')"` ou `npm run start:dev`
Expected: log do Nest mapeando `/trucks` em POST, GET, GET/:id, PATCH/:id e DELETE/:id.

- [ ] **Step 6: Commit**

```bash
git add src/modules/trucks/presentation src/modules/trucks/trucks.module.ts src/app.module.ts
git commit -m "feat(trucks): expoe endpoints REST de veiculos"
```

---

### Task 8: Frontend — service real

**Files:**
- Modify: `front-end-truck/src/types/api.ts`
- Modify: `front-end-truck/src/services/fleet/vehicle-service.ts`
- Modify: `front-end-truck/src/types/fleet.ts`
- Modify: `front-end-truck/src/services/fleet/seed.ts`
- Modify: `front-end-truck/src/lib/fleet-schemas.ts`
- Modify: `front-end-truck/src/pages/AdminBaseOperacional.tsx`
- Test: `front-end-truck/src/services/fleet/vehicle-service.test.ts`

**Interfaces:**
- Consumes: `TruckResponse` do backend (Task 5).
- Produces: `vehicleService` com as mesmas cinco funções de hoje (`getVehicles`, `getVehicle`, `createVehicle`, `updateVehicle`, `deleteVehicle`), agora sobre HTTP.

- [ ] **Step 1: Escrever o teste que falha**

`front-end-truck/src/services/fleet/vehicle-service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { vehicleService } from "@/services/fleet/vehicle-service";
import * as httpClient from "@/lib/http-client";

const truckResponse = {
  id: "truck-1",
  plate: "ABC1D23",
  rntrc: null,
  brandModel: "Volvo FH 540",
  year: 2021,
  type: "TRUCK",
  capacity: 14,
  status: "ATIVO",
  driverId: null,
  createdAt: "2026-08-21T10:00:00.000Z",
  updatedAt: "2026-08-21T10:00:00.000Z",
};

describe("vehicleService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("mapeia a resposta da API para o tipo Vehicle", async () => {
    vi.spyOn(httpClient, "apiRequest").mockResolvedValue([truckResponse]);

    const vehicles = await vehicleService.getVehicles();

    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]).toMatchObject({
      id: "truck-1",
      plate: "ABC1D23",
      type: "TRUCK",
      capacity: 14,
      year: 2021,
      status: "ATIVO",
    });
  });

  it("envia o payload de criacao no formato do backend", async () => {
    const spy = vi.spyOn(httpClient, "apiRequest").mockResolvedValue(truckResponse);

    await vehicleService.createVehicle({
      plate: "ABC1D23",
      brandModel: "Volvo FH 540",
      type: "TRUCK",
      capacity: 14,
      year: 2021,
      status: "ATIVO",
    });

    expect(spy).toHaveBeenCalledWith("/trucks", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      plate: "ABC1D23",
      brandModel: "Volvo FH 540",
      type: "TRUCK",
      capacity: 14,
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd front-end-truck && npx vitest run src/services/fleet/vehicle-service.test.ts`
Expected: FAIL — `apiRequest` não é chamado, o service ainda usa o mock.

- [ ] **Step 3: Adicionar `TruckResponse` em `types/api.ts`**

```ts
export interface TruckResponse {
  id: string;
  plate: string;
  rntrc: string | null;
  brandModel: string;
  year: number | null;
  type: "TRUCK" | "CARRETA" | "BITREM" | "VAN";
  capacity: number;
  status: "ATIVO" | "MANUTENCAO" | "INATIVO";
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Reescrever o `vehicleService`**

`front-end-truck/src/services/fleet/vehicle-service.ts`:

```ts
import { apiRequest } from "@/lib/http-client";
import type { TruckResponse } from "@/types/api";
import type { CreateVehiclePayload, UpdateVehiclePayload, Vehicle } from "@/types/fleet";

const toVehicle = (response: TruckResponse): Vehicle => ({
  id: response.id,
  plate: response.plate,
  type: response.type,
  capacity: response.capacity,
  brandModel: response.brandModel,
  year: response.year ?? 0,
  status: response.status,
  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
});

const toRequest = (payload: CreateVehiclePayload | UpdateVehiclePayload) => ({
  plate: payload.plate,
  brandModel: payload.brandModel,
  type: payload.type,
  capacity: payload.capacity,
  year: payload.year,
  status: payload.status,
});

export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    const response = await apiRequest<TruckResponse[]>("/trucks");
    return response.map(toVehicle);
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const response = await apiRequest<TruckResponse>(`/trucks/${id}`);
    return toVehicle(response);
  },

  async createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
    const response = await apiRequest<TruckResponse>("/trucks", {
      method: "POST",
      body: JSON.stringify(toRequest(payload)),
    });
    return toVehicle(response);
  },

  async updateVehicle(id: string, payload: UpdateVehiclePayload): Promise<Vehicle> {
    const response = await apiRequest<TruckResponse>(`/trucks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(toRequest(payload)),
    });
    return toVehicle(response);
  },

  async deleteVehicle(id: string): Promise<void> {
    await apiRequest<void>(`/trucks/${id}`, { method: "DELETE" });
  },
};
```

O `brandModel` é obrigatório no backend e não existe no formulário atual, então ele entra como campo novo no passo seguinte. `toVehicle` também passa a expor `brandModel` no tipo `Vehicle`.

- [ ] **Step 5: Adicionar "Marca/Modelo" ao formulário de veículo**

Em `front-end-truck/src/lib/fleet-schemas.ts`, dentro de `vehicleFormSchema`, depois de `plate` e removendo `documents`:

```ts
  brandModel: requiredString("Informe a marca/modelo."),
```

Em `src/types/fleet.ts`, `Vehicle` ganha `brandModel: string` e perde `documents`.

Em `src/pages/AdminBaseOperacional.tsx`, no `VehicleForm`, ao lado do campo de placa:

```tsx
        <AdminField label="Marca/Modelo" error={errors.brandModel?.message}>
          <Input {...register("brandModel")} placeholder="Ex: Volvo FH 540" />
        </AdminField>
```

Incluir `brandModel: vehicle?.brandModel || ""` nos `values` do `useForm` e `brandModel: values.brandModel.trim()` no payload de submit. A coluna "Marca/Modelo" também entra na tabela de veículos, ao lado de "Placa".

- [ ] **Step 6: Remover o mock de veículos**

Em `front-end-truck/src/services/fleet/seed.ts`, remover `vehiclesSeed` e o import de `Vehicle` se ficar órfão. Em `src/types/fleet.ts`, remover `documents` de `Vehicle`. Corrigir os usos que quebrarem (`npx tsc --noEmit -p tsconfig.app.json` aponta).

- [ ] **Step 7: Rodar os testes**

Run: `cd front-end-truck && npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: testes passando; `tsc` com no máximo os 9 erros pré-existentes da `main`.

- [ ] **Step 8: Commit**

```bash
cd front-end-truck
git add src/lib/fleet-schemas.ts src/pages/AdminBaseOperacional.tsx src/services/fleet/vehicle-service.ts src/services/fleet/vehicle-service.test.ts src/types/api.ts src/types/fleet.ts src/services/fleet/seed.ts
git commit -m "feat(veiculos): consome API real de veiculos"
```

---

### Task 9: Verificação ponta a ponta

**Files:** nenhum arquivo novo.

**Interfaces:**
- Consumes: tudo das tasks anteriores.
- Produces: evidência de que o fluxo funciona contra o backend real.

- [ ] **Step 1: Subir backend e banco local**

Run: `docker compose up -d` (usa `docker-compose.yml` de desenvolvimento)
Expected: containers de Postgres e backend no ar; log de migrations aplicadas, incluindo `AddTruckDetails1760500000000`.

- [ ] **Step 2: Conferir a coluna nova no banco**

Run: `docker compose exec db psql -U postgres -d truck -c "\d trucks"`
Expected: colunas `type`, `capacity` e `status` presentes; FK `fk_trucks_driver` referenciando `drivers`.

- [ ] **Step 3: Exercitar os endpoints**

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","password":"senha"}' | jq -r .accessToken)

curl -s -X POST localhost:3000/trucks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"plate":"ABC1D23","brandModel":"Volvo FH 540","year":2021,"type":"TRUCK","capacity":14}' | jq

curl -s localhost:3000/trucks -H "Authorization: Bearer $TOKEN" | jq
```
Expected: `201` com o veículo criado; a listagem traz o registro. Repetir o POST com a mesma placa deve retornar `409`.

- [ ] **Step 4: Conferir na tela**

Run: `cd front-end-truck && npm run dev`
Expected: em Admin › Base Operacional › Veículos, o caminhão criado via curl aparece na tabela; cadastrar um novo pela tela e recarregar (F5) mantém o registro, agora vindo do Postgres e não do `localStorage`.

- [ ] **Step 5: Commit final e deploy**

Nada a commitar se os passos anteriores passaram. O deploy na VPS é executado pelo usuário:

```bash
python3 deploy_vps_incremental.py   # ou ./deploy-to-vps.sh usuario@40.160.82.252
```

As migrations rodam sozinhas no start do container (`docker-entrypoint.sh:22`).
