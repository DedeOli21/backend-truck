# Cadastro de Motorista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real driver ("motorista") registration module — backend API + connected admin UI — replacing the mock-only frontend and the field-less `users` table.

**Architecture:** New backend NestJS module `drivers` (domain/application/infrastructure/presentation, mirrors `finance`/`payables`), a new `drivers` table (+ `driver_reference_contacts`, `driver_audit_logs`) independent from `users` (profile-first, login created later out of scope), and CNH images stored on the VPS local disk (no S3). Frontend: `AdminBaseOperacional.tsx`'s existing "Motoristas" tab becomes the single driver UI, wired to the new API through `driver-service.ts`; the orphan `Motoristas.tsx` mock page is deleted.

**Tech Stack:** NestJS 10, TypeORM 0.3 + Postgres, class-validator/class-transformer, multer (new dep) for uploads, native Node 20 `fetch` for ViaCEP (no new HTTP client dep). Frontend: React, react-hook-form + zod, TanStack Query, existing `apiRequest` fetch wrapper.

**Spec:** `docs/superpowers/specs/2026-08-13-cadastro-motorista-design.md`

## Global Constraints

- Backend runs on a single OVHcloud VPS (not Lambda) — local disk storage for CNH images persists and is safe to use.
- All `/drivers` endpoints are ADMIN-only.
- Cadastro creates a **profile only** — no `users` login row is created here (that's a separate, future activation flow). `drivers.user_id` stays `null`.
- CNH vencida does **not** block saving — it's returned as a computed `cnh.expired` boolean.
- Status enum: `EM_ANALISE | APROVADO | REPROVADO`. Default on create: `EM_ANALISE`.
- PIX key **type is auto-detected server-side** from the key's format — the client never sends a type, only the raw key.
- No delete endpoint/action for drivers (not in the user story; status covers lifecycle).
- Update (`PATCH /drivers/:id`) is a full-field replace — same shape as create, minus status (status changes only via the dedicated `/status` endpoint).
- Follow existing repo conventions exactly: path aliases (`@drivers/*`, `@database/*`, etc.), the `isTest` in-memory/postgres repository swap pattern, plain-class domain entities, `@Inject(TOKEN)` DI.

---

## Task 1: Dependencies, enums, and CPF/CNPJ/PIS/PIX validators

**Files:**
- Modify: `package.json` (add `multer`, `@types/multer`)
- Modify: `src/database/typeorm/entities/enums.ts`
- Create: `src/modules/drivers/domain/validators/only-digits.ts`
- Create: `src/modules/drivers/domain/validators/cpf.validator.ts`
- Create: `src/modules/drivers/domain/validators/cnpj.validator.ts`
- Create: `src/modules/drivers/domain/validators/pis.validator.ts`
- Create: `src/modules/drivers/domain/validators/pix-key.validator.ts`
- Test: `src/modules/drivers/domain/validators/validators.spec.ts`

**Interfaces:**
- Produces: `onlyDigits(value: string): string`; `isValidCpf(value: string): boolean`; `isValidCnpj(value: string): boolean`; `isValidPis(value: string): boolean`; `detectPixKeyType(key: string): PixKeyType | null`; `isValidPixKey(key: string, type: PixKeyType): boolean`; enums `DriverStatus`, `CnhCategory`, `PixKeyType`, `DriverAuditAction` from `@database/typeorm/entities/enums`.

- [ ] **Step 1: Install dependencies**

Run: `npm install multer && npm install -D @types/multer`

- [ ] **Step 2: Add new enums**

Add to `src/database/typeorm/entities/enums.ts`:

```ts
export enum DriverStatus {
  EM_ANALISE = 'EM_ANALISE',
  APROVADO = 'APROVADO',
  REPROVADO = 'REPROVADO',
}

export enum CnhCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum PixKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  RANDOM = 'RANDOM',
}

export enum DriverAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}
```

- [ ] **Step 3: Write the failing validator tests**

Create `src/modules/drivers/domain/validators/validators.spec.ts`:

```ts
import { PixKeyType } from '@database/typeorm/entities/enums';
import { isValidCnpj } from '@drivers/domain/validators/cnpj.validator';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';
import { isValidPis } from '@drivers/domain/validators/pis.validator';
import { detectPixKeyType, isValidPixKey } from '@drivers/domain/validators/pix-key.validator';

describe('onlyDigits', () => {
  it('remove caracteres nao numericos', () => {
    expect(onlyDigits('123.456-78')).toBe('12345678');
  });
});

describe('isValidCpf', () => {
  it('aceita CPF valido', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejeita CPF com digitos verificadores errados', () => {
    expect(isValidCpf('52998224700')).toBe(false);
  });

  it('rejeita CPF com todos os digitos iguais', () => {
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(isValidCpf('123')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('aceita CNPJ valido', () => {
    expect(isValidCnpj('11444777000161')).toBe(true);
  });

  it('rejeita CNPJ com digito verificador errado', () => {
    expect(isValidCnpj('11444777000199')).toBe(false);
  });
});

describe('isValidPis', () => {
  it('aceita PIS valido', () => {
    expect(isValidPis('12056275319')).toBe(true);
  });

  it('rejeita PIS com digito verificador errado', () => {
    expect(isValidPis('12056275310')).toBe(false);
  });
});

describe('detectPixKeyType', () => {
  it('detecta email', () => {
    expect(detectPixKeyType('motorista@example.com')).toBe(PixKeyType.EMAIL);
  });

  it('detecta CPF pelo tamanho', () => {
    expect(detectPixKeyType('52998224725')).toBe(PixKeyType.CPF);
  });

  it('detecta CNPJ pelo tamanho', () => {
    expect(detectPixKeyType('11444777000161')).toBe(PixKeyType.CNPJ);
  });

  it('detecta telefone com prefixo +55', () => {
    expect(detectPixKeyType('+5511999998888')).toBe(PixKeyType.PHONE);
  });

  it('detecta chave aleatoria (uuid)', () => {
    expect(detectPixKeyType('550e8400-e29b-41d4-a716-446655440000')).toBe(PixKeyType.RANDOM);
  });

  it('retorna null para formato nao reconhecido', () => {
    expect(detectPixKeyType('abc')).toBeNull();
  });
});

describe('isValidPixKey', () => {
  it('valida CPF invalido mesmo com tamanho correto', () => {
    expect(isValidPixKey('11111111111', PixKeyType.CPF)).toBe(false);
  });

  it('valida email valido', () => {
    expect(isValidPixKey('motorista@example.com', PixKeyType.EMAIL)).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- validators.spec.ts`
Expected: FAIL (modules not found — files don't exist yet).

- [ ] **Step 5: Implement `only-digits.ts`**

```ts
export const onlyDigits = (value: string): string => value.replace(/\D/g, '');
```

- [ ] **Step 6: Implement `cpf.validator.ts`**

```ts
import { onlyDigits } from '@drivers/domain/validators/only-digits';

const calcCheckDigit = (base: number[]): number => {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCpf = (rawCpf: string): boolean => {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split('').map(Number);
  const firstCheckDigit = calcCheckDigit(digits.slice(0, 9));
  const secondCheckDigit = calcCheckDigit([...digits.slice(0, 9), firstCheckDigit]);

  return firstCheckDigit === digits[9] && secondCheckDigit === digits[10];
};
```

- [ ] **Step 7: Implement `cnpj.validator.ts`**

```ts
import { onlyDigits } from '@drivers/domain/validators/only-digits';

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const calcCheckDigit = (base: number[], weights: number[]): number => {
  const sum = base.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = (rawCnpj: string): boolean => {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const digits = cnpj.split('').map(Number);
  const firstCheckDigit = calcCheckDigit(digits.slice(0, 12), FIRST_WEIGHTS);
  const secondCheckDigit = calcCheckDigit([...digits.slice(0, 12), firstCheckDigit], SECOND_WEIGHTS);

  return firstCheckDigit === digits[12] && secondCheckDigit === digits[13];
};
```

- [ ] **Step 8: Implement `pis.validator.ts`**

```ts
import { onlyDigits } from '@drivers/domain/validators/only-digits';

const WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const isValidPis = (rawPis: string): boolean => {
  const pis = onlyDigits(rawPis);
  if (pis.length !== 11 || /^(\d)\1{10}$/.test(pis)) {
    return false;
  }

  const digits = pis.split('').map(Number);
  const sum = digits.slice(0, 10).reduce((acc, digit, index) => acc + digit * WEIGHTS[index], 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === digits[10];
};
```

- [ ] **Step 9: Implement `pix-key.validator.ts`**

```ts
import { PixKeyType } from '@database/typeorm/entities/enums';
import { isValidCnpj } from '@drivers/domain/validators/cnpj.validator';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RANDOM_KEY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const detectPixKeyType = (rawKey: string): PixKeyType | null => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  if (EMAIL_REGEX.test(key)) {
    return PixKeyType.EMAIL;
  }
  if (RANDOM_KEY_REGEX.test(key)) {
    return PixKeyType.RANDOM;
  }
  if (key.startsWith('+') && digits.length >= 12 && digits.length <= 13) {
    return PixKeyType.PHONE;
  }
  if (digits.length === 11) {
    return PixKeyType.CPF;
  }
  if (digits.length === 14) {
    return PixKeyType.CNPJ;
  }
  return null;
};

export const isValidPixKey = (rawKey: string, type: PixKeyType): boolean => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  switch (type) {
    case PixKeyType.EMAIL:
      return EMAIL_REGEX.test(key);
    case PixKeyType.RANDOM:
      return RANDOM_KEY_REGEX.test(key);
    case PixKeyType.PHONE:
      return key.startsWith('+') && digits.length >= 12 && digits.length <= 13;
    case PixKeyType.CPF:
      return digits.length === 11 && isValidCpf(digits);
    case PixKeyType.CNPJ:
      return digits.length === 14 && isValidCnpj(digits);
    default:
      return false;
  }
};
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test -- validators.spec.ts`
Expected: PASS, all cases green.

- [ ] **Step 11: Add `@drivers/*` path alias**

In `tsconfig.json`, inside `compilerOptions.paths`, add (alphabetically alongside the other module aliases):

```json
"@drivers/*": ["src/modules/drivers/*"],
```

In `jest.config.ts`, inside `moduleNameMapper`, add:

```ts
'^@drivers/(.*)$': '<rootDir>/src/modules/drivers/$1',
```

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json jest.config.ts src/database/typeorm/entities/enums.ts src/modules/drivers/domain/validators
git commit -m "feat(drivers): add validators for CPF, CNPJ, PIS and PIX keys"
```

---

## Task 2: Domain entities, repository interfaces, and in-memory repositories

**Files:**
- Create: `src/modules/drivers/domain/entities/driver.entity.ts`
- Create: `src/modules/drivers/domain/entities/driver-reference-contact.entity.ts`
- Create: `src/modules/drivers/domain/entities/driver-audit-log.entity.ts`
- Create: `src/modules/drivers/domain/repositories/drivers.repository.ts`
- Create: `src/modules/drivers/domain/repositories/driver-audit-log.repository.ts`
- Create: `src/modules/drivers/infrastructure/repositories/in-memory-drivers.repository.ts`
- Create: `src/modules/drivers/infrastructure/repositories/in-memory-driver-audit-log.repository.ts`

**Interfaces:**
- Consumes: `DriverStatus`, `CnhCategory`, `PixKeyType`, `DriverAuditAction` from `@database/typeorm/entities/enums` (Task 1).
- Produces: class `DriverEntity` (constructor listed below), class `DriverReferenceContactEntity`, class `DriverAuditLogEntity`; `DRIVERS_REPOSITORY` token + `DriversRepository` interface + `DriverWithContacts` type; `DRIVER_AUDIT_LOG_REPOSITORY` token + `DriverAuditLogRepository` interface; `InMemoryDriversRepository`, `InMemoryDriverAuditLogRepository` classes implementing those interfaces. Task 5 (service) and Task 6 (postgres repos) depend on these exact names/signatures.

- [ ] **Step 1: Create `driver.entity.ts`**

```ts
import { CnhCategory, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';

export class DriverEntity {
  constructor(
    public readonly id: string,
    public readonly fullName: string,
    public readonly cpf: string,
    public readonly pis: string,
    public readonly addressStreet: string,
    public readonly addressNumber: string,
    public readonly addressComplement: string | null,
    public readonly addressNeighborhood: string,
    public readonly addressCity: string,
    public readonly addressState: string,
    public readonly addressZip: string,
    public readonly cnhNumber: string,
    public readonly cnhCategory: CnhCategory,
    public readonly cnhExpiresAt: Date,
    public cnhImagePath: string | null,
    public readonly pixKeyType: PixKeyType,
    public readonly pixKey: string,
    public status: DriverStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  isCnhExpired(): boolean {
    return this.cnhExpiresAt.getTime() < Date.now();
  }
}
```

- [ ] **Step 2: Create `driver-reference-contact.entity.ts`**

```ts
export class DriverReferenceContactEntity {
  constructor(
    public readonly id: string,
    public readonly driverId: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly relationship: string,
  ) {}
}
```

- [ ] **Step 3: Create `driver-audit-log.entity.ts`**

```ts
import { DriverAuditAction } from '@database/typeorm/entities/enums';

export class DriverAuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly driverId: string,
    public readonly action: DriverAuditAction,
    public readonly actorUserId: string,
    public readonly payloadSnapshot: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}
}
```

- [ ] **Step 4: Create `drivers.repository.ts`**

```ts
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';

export const DRIVERS_REPOSITORY = 'DRIVERS_REPOSITORY';

export interface DriverWithContacts {
  driver: DriverEntity;
  contacts: DriverReferenceContactEntity[];
}

export interface DriversRepository {
  create(driver: DriverEntity, contacts: DriverReferenceContactEntity[]): Promise<DriverWithContacts>;
  findById(id: string): Promise<DriverWithContacts | null>;
  findByCpf(cpf: string): Promise<DriverEntity | null>;
  list(status?: DriverStatus): Promise<DriverWithContacts[]>;
  update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts>;
  updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts>;
  saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts>;
}
```

- [ ] **Step 5: Create `driver-audit-log.repository.ts`**

```ts
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';

export const DRIVER_AUDIT_LOG_REPOSITORY = 'DRIVER_AUDIT_LOG_REPOSITORY';

export interface DriverAuditLogRepository {
  log(entry: DriverAuditLogEntity): Promise<void>;
  listByDriver(driverId: string): Promise<DriverAuditLogEntity[]>;
}
```

- [ ] **Step 6: Create `in-memory-drivers.repository.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import {
  DriverWithContacts,
  DriversRepository,
} from '@drivers/domain/repositories/drivers.repository';

@Injectable()
export class InMemoryDriversRepository implements DriversRepository {
  private readonly drivers = new Map<string, DriverEntity>();
  private readonly contacts = new Map<string, DriverReferenceContactEntity[]>();

  async create(
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    this.drivers.set(driver.id, driver);
    this.contacts.set(driver.id, contacts);
    return { driver, contacts };
  }

  async findById(id: string): Promise<DriverWithContacts | null> {
    const driver = this.drivers.get(id);
    if (!driver) {
      return null;
    }
    return { driver, contacts: this.contacts.get(id) ?? [] };
  }

  async findByCpf(cpf: string): Promise<DriverEntity | null> {
    return [...this.drivers.values()].find((driver) => driver.cpf === cpf) ?? null;
  }

  async list(status?: DriverStatus): Promise<DriverWithContacts[]> {
    return [...this.drivers.values()]
      .filter((driver) => !status || driver.status === status)
      .map((driver) => ({ driver, contacts: this.contacts.get(driver.id) ?? [] }));
  }

  async update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    if (!this.drivers.has(id)) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    this.drivers.set(id, driver);
    this.contacts.set(id, contacts);
    return { driver, contacts };
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts> {
    const existing = this.drivers.get(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    existing.status = status;
    existing.updatedAt = new Date();
    return { driver: existing, contacts: this.contacts.get(id) ?? [] };
  }

  async saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts> {
    const existing = this.drivers.get(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    existing.cnhImagePath = imagePath;
    existing.updatedAt = new Date();
    return { driver: existing, contacts: this.contacts.get(id) ?? [] };
  }
}
```

- [ ] **Step 7: Create `in-memory-driver-audit-log.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverAuditLogRepository } from '@drivers/domain/repositories/driver-audit-log.repository';

@Injectable()
export class InMemoryDriverAuditLogRepository implements DriverAuditLogRepository {
  private readonly entries: DriverAuditLogEntity[] = [];

  async log(entry: DriverAuditLogEntity): Promise<void> {
    this.entries.push(entry);
  }

  async listByDriver(driverId: string): Promise<DriverAuditLogEntity[]> {
    return this.entries.filter((entry) => entry.driverId === driverId);
  }
}
```

- [ ] **Step 8: Verify it builds**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors from the new files (unused-export errors are fine at this stage, nothing consumes them yet).

- [ ] **Step 9: Commit**

```bash
git add src/modules/drivers/domain src/modules/drivers/infrastructure/repositories
git commit -m "feat(drivers): add domain entities, repository interfaces and in-memory repos"
```

---

## Task 3: Migration + TypeORM ORM entities

**Files:**
- Create: `src/database/typeorm/migrations/1760100000000-AddDrivers.ts`
- Create: `src/database/typeorm/entities/driver.orm-entity.ts`
- Create: `src/database/typeorm/entities/driver-reference-contact.orm-entity.ts`
- Create: `src/database/typeorm/entities/driver-audit-log.orm-entity.ts`
- Modify: `src/database/typeorm/entities/index.ts`
- Modify: `src/database/database.module.ts`
- Modify: `src/database/typeorm/data-source.ts`

**Interfaces:**
- Consumes: `DriverStatus`, `CnhCategory`, `PixKeyType`, `DriverAuditAction` enums (Task 1).
- Produces: `DriverOrmEntity`, `DriverReferenceContactOrmEntity`, `DriverAuditLogOrmEntity` — exact column names or Task 4 (postgres repositories) can't map to them. Tables `drivers`, `driver_reference_contacts`, `driver_audit_logs` exist in the DB after this task runs.

- [ ] **Step 1: Write the migration**

Create `src/database/typeorm/migrations/1760100000000-AddDrivers.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDrivers1760100000000 implements MigrationInterface {
  name = 'AddDrivers1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TYPE driver_status AS ENUM ('EM_ANALISE', 'APROVADO', 'REPROVADO')");
    await queryRunner.query("CREATE TYPE cnh_category AS ENUM ('A', 'B', 'C', 'D', 'E')");
    await queryRunner.query(
      "CREATE TYPE pix_key_type AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM')",
    );
    await queryRunner.query(
      "CREATE TYPE driver_audit_action AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED')",
    );

    await queryRunner.query(`
      CREATE TABLE drivers (
        id uuid PRIMARY KEY,
        user_id uuid UNIQUE,
        full_name varchar(150) NOT NULL,
        cpf varchar(11) UNIQUE NOT NULL,
        pis varchar(11) NOT NULL,
        address_street varchar(255) NOT NULL,
        address_number varchar(20) NOT NULL,
        address_complement varchar(255),
        address_neighborhood varchar(150) NOT NULL,
        address_city varchar(150) NOT NULL,
        address_state varchar(2) NOT NULL,
        address_zip varchar(8) NOT NULL,
        cnh_number varchar(30) NOT NULL,
        cnh_category cnh_category NOT NULL,
        cnh_expires_at date NOT NULL,
        cnh_image_path varchar(500),
        pix_key_type pix_key_type NOT NULL,
        pix_key varchar(255) NOT NULL,
        status driver_status NOT NULL DEFAULT 'EM_ANALISE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE driver_reference_contacts (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        name varchar(150) NOT NULL,
        phone varchar(11) NOT NULL,
        relationship varchar(100) NOT NULL,
        CONSTRAINT fk_contacts_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE driver_audit_logs (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        action driver_audit_action NOT NULL,
        actor_user_id uuid NOT NULL,
        payload_snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_driver_contacts_driver_id ON driver_reference_contacts(driver_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_driver_audit_logs_driver_id ON driver_audit_logs(driver_id, created_at DESC)',
    );
    await queryRunner.query('CREATE INDEX idx_drivers_status ON drivers(status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_drivers_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_audit_logs_driver_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_contacts_driver_id');

    await queryRunner.query('DROP TABLE IF EXISTS driver_audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS driver_reference_contacts');
    await queryRunner.query('DROP TABLE IF EXISTS drivers');

    await queryRunner.query('DROP TYPE IF EXISTS driver_audit_action');
    await queryRunner.query('DROP TYPE IF EXISTS pix_key_type');
    await queryRunner.query('DROP TYPE IF EXISTS cnh_category');
    await queryRunner.query('DROP TYPE IF EXISTS driver_status');
  }
}
```

- [ ] **Step 2: Create `driver.orm-entity.ts`**

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CnhCategory, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';
import { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';

@Entity({ name: 'drivers' })
export class DriverOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf!: string;

  @Column({ type: 'varchar', length: 11 })
  pis!: string;

  @Column({ name: 'address_street', type: 'varchar', length: 255 })
  addressStreet!: string;

  @Column({ name: 'address_number', type: 'varchar', length: 20 })
  addressNumber!: string;

  @Column({ name: 'address_complement', type: 'varchar', length: 255, nullable: true })
  addressComplement!: string | null;

  @Column({ name: 'address_neighborhood', type: 'varchar', length: 150 })
  addressNeighborhood!: string;

  @Column({ name: 'address_city', type: 'varchar', length: 150 })
  addressCity!: string;

  @Column({ name: 'address_state', type: 'varchar', length: 2 })
  addressState!: string;

  @Column({ name: 'address_zip', type: 'varchar', length: 8 })
  addressZip!: string;

  @Column({ name: 'cnh_number', type: 'varchar', length: 30 })
  cnhNumber!: string;

  @Column({ name: 'cnh_category', type: 'enum', enum: CnhCategory })
  cnhCategory!: CnhCategory;

  @Column({ name: 'cnh_expires_at', type: 'date' })
  cnhExpiresAt!: string;

  @Column({ name: 'cnh_image_path', type: 'varchar', length: 500, nullable: true })
  cnhImagePath!: string | null;

  @Column({ name: 'pix_key_type', type: 'enum', enum: PixKeyType })
  pixKeyType!: PixKeyType;

  @Column({ name: 'pix_key', type: 'varchar', length: 255 })
  pixKey!: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.EM_ANALISE })
  status!: DriverStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => DriverReferenceContactOrmEntity, (contact) => contact.driver)
  contacts!: DriverReferenceContactOrmEntity[];
}
```

- [ ] **Step 3: Create `driver-reference-contact.orm-entity.ts`**

```ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';

@Entity({ name: 'driver_reference_contacts' })
export class DriverReferenceContactOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 11 })
  phone!: string;

  @Column({ type: 'varchar', length: 100 })
  relationship!: string;

  @ManyToOne(() => DriverOrmEntity, (driver) => driver.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverOrmEntity;
}
```

- [ ] **Step 4: Create `driver-audit-log.orm-entity.ts`**

```ts
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { DriverAuditAction } from '@database/typeorm/entities/enums';

@Entity({ name: 'driver_audit_logs' })
export class DriverAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'enum', enum: DriverAuditAction })
  action!: DriverAuditAction;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb' })
  payloadSnapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

- [ ] **Step 5: Register entities in the barrel, database module, and data source**

In `src/database/typeorm/entities/index.ts`, add:

```ts
export { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
export { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';
export { DriverAuditLogOrmEntity } from '@database/typeorm/entities/driver-audit-log.orm-entity';
```

and add `DriverStatus, CnhCategory, PixKeyType, DriverAuditAction` to the existing re-export list from `enums`.

In `src/database/database.module.ts`, import the three new ORM entities and add them to the `entities: [...]` array passed to `TypeOrmModule.forRoot`.

In `src/database/typeorm/data-source.ts`, import the same three entities from `@database/typeorm/entities` and add them to the `entities: [...]` array.

- [ ] **Step 6: Run the migration against local Postgres**

Run: `npm run migration:run`
Expected: output shows `AddDrivers1760100000000` applied with no errors. Confirm with `psql` (or any client) that `drivers`, `driver_reference_contacts`, `driver_audit_logs` tables exist.

- [ ] **Step 7: Verify the down-migration is safe**

Run: `npm run migration:revert` then `npm run migration:run` again.
Expected: both succeed cleanly — proves `down()` fully undoes `up()`.

- [ ] **Step 8: Commit**

```bash
git add src/database
git commit -m "feat(drivers): add drivers schema migration and TypeORM entities"
```

---

## Task 4: DTOs

**Files:**
- Create: `src/modules/drivers/presentation/dtos/reference-contact.dto.ts`
- Create: `src/modules/drivers/presentation/dtos/create-driver.dto.ts`
- Create: `src/modules/drivers/presentation/dtos/update-driver.dto.ts`
- Create: `src/modules/drivers/presentation/dtos/update-driver-status.dto.ts`

**Interfaces:**
- Consumes: `CnhCategory`, `DriverStatus` enums (Task 1).
- Produces: `ReferenceContactDto`, `CreateDriverDto`, `UpdateDriverDto`, `UpdateDriverStatusDto` — Task 5 (service) and Task 7 (controller) consume these exact classes/fields: `fullName, cpf, pis, addressStreet, addressNumber, addressComplement?, addressNeighborhood, addressCity, addressState, addressZip, cnhNumber, cnhCategory, cnhExpiresAt, pixKey, contacts: ReferenceContactDto[]`.

- [ ] **Step 1: Create `reference-contact.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Matches, MinLength } from 'class-validator';

export class ReferenceContactDto {
  @ApiProperty({ example: 'Maria Silva' })
  @MinLength(3, { message: 'Nome do contato deve ter ao menos 3 caracteres' })
  name!: string;

  @ApiProperty({ example: '11999998888' })
  @Matches(/^\d{2}9?\d{8}$/, { message: 'Telefone deve conter DDD + numero (10 ou 11 digitos)' })
  phone!: string;

  @ApiProperty({ example: 'Irmao' })
  @MinLength(2, { message: 'Grau de relacao deve ter ao menos 2 caracteres' })
  relationship!: string;
}
```

- [ ] **Step 2: Create `create-driver.dto.ts`**

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CnhCategory } from '@database/typeorm/entities/enums';
import { ReferenceContactDto } from '@drivers/presentation/dtos/reference-contact.dto';

export class CreateDriverDto {
  @ApiProperty({ example: 'Joao da Silva Santos' })
  @Matches(/^[A-Za-zÀ-ÿ\s]+$/, { message: 'Nome deve conter apenas letras e espacos' })
  @MinLength(5, { message: 'Nome deve ter ao menos 5 caracteres' })
  fullName!: string;

  @ApiProperty({ example: '52998224725' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 digitos' })
  cpf!: string;

  @ApiProperty({ example: '12056275319' })
  @Matches(/^\d{11}$/, { message: 'PIS deve conter 11 digitos' })
  pis!: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(1)
  addressStreet!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  addressNumber!: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @MinLength(1)
  addressNeighborhood!: string;

  @ApiProperty({ example: 'Sao Paulo' })
  @IsString()
  @MinLength(1)
  addressCity!: string;

  @ApiProperty({ example: 'SP' })
  @Matches(/^[A-Za-z]{2}$/, { message: 'Estado deve ter 2 letras' })
  addressState!: string;

  @ApiProperty({ example: '01310100' })
  @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 digitos' })
  addressZip!: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @MinLength(1)
  cnhNumber!: string;

  @ApiProperty({ enum: CnhCategory })
  @IsEnum(CnhCategory, { message: 'Categoria de CNH invalida' })
  cnhCategory!: CnhCategory;

  @ApiProperty({ example: '2028-05-01' })
  @IsDateString()
  cnhExpiresAt!: string;

  @ApiProperty({ example: 'motorista@example.com' })
  @IsString()
  @MinLength(3)
  pixKey!: string;

  @ApiProperty({ type: [ReferenceContactDto] })
  @ValidateNested({ each: true })
  @Type(() => ReferenceContactDto)
  @ArrayMinSize(3, { message: 'Sao necessarios exatamente 3 contatos de referencia' })
  @ArrayMaxSize(3, { message: 'Sao necessarios exatamente 3 contatos de referencia' })
  contacts!: ReferenceContactDto[];
}
```

- [ ] **Step 3: Create `update-driver.dto.ts`**

```ts
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';

export class UpdateDriverDto extends CreateDriverDto {}
```

- [ ] **Step 4: Create `update-driver-status.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DriverStatus } from '@database/typeorm/entities/enums';

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status!: DriverStatus;
}
```

- [ ] **Step 5: Verify it builds**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/drivers/presentation/dtos
git commit -m "feat(drivers): add create/update/status DTOs with validation"
```

---

## Task 5: DriversService (application layer)

**Files:**
- Create: `src/modules/drivers/application/services/drivers.service.ts`
- Test: `src/modules/drivers/application/services/drivers.service.spec.ts`

**Interfaces:**
- Consumes: `DriversRepository`/`DRIVERS_REPOSITORY`, `DriverAuditLogRepository`/`DRIVER_AUDIT_LOG_REPOSITORY`, `DriverEntity`, `DriverReferenceContactEntity`, `DriverAuditLogEntity` (Task 2); `InMemoryDriversRepository`, `InMemoryDriverAuditLogRepository` (Task 2, for tests); `CreateDriverDto`, `UpdateDriverDto`, `ReferenceContactDto` (Task 4); validators from Task 1.
- Produces: `DriverResponse` type (nested `address`/`cnh` objects, `cnh.expired: boolean`, `cnh.hasImage: boolean` — no raw file path exposed) and class `DriversService` with methods `create(dto, actorUserId)`, `findById(id)`, `list(status?)`, `update(id, dto, actorUserId)`, `updateStatus(id, status, actorUserId)`, `saveCnhImagePath(id, absolutePath, actorUserId)` — all returning `Promise<DriverResponse>` (or `Promise<DriverResponse[]>` for `list`) — plus `getCnhImagePath(id): Promise<string>` (throws `NotFoundException` if no image), used only by the controller's download handler to keep the raw filesystem path out of `DriverResponse`. Task 7 (controller) calls these exact methods.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/drivers/application/services/drivers.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { InMemoryDriverAuditLogRepository } from '@drivers/infrastructure/repositories/in-memory-driver-audit-log.repository';
import { InMemoryDriversRepository } from '@drivers/infrastructure/repositories/in-memory-drivers.repository';
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';

const validPayload = (): CreateDriverDto => ({
  fullName: 'Joao da Silva Santos',
  cpf: '52998224725',
  pis: '12056275319',
  addressStreet: 'Rua das Flores',
  addressNumber: '123',
  addressNeighborhood: 'Centro',
  addressCity: 'Sao Paulo',
  addressState: 'SP',
  addressZip: '01310100',
  cnhNumber: '123456789',
  cnhCategory: 'B' as CreateDriverDto['cnhCategory'],
  cnhExpiresAt: '2028-05-01',
  pixKey: 'motorista@example.com',
  contacts: [
    { name: 'Maria Silva', phone: '11999998888', relationship: 'Irmao' },
    { name: 'Pedro Souza', phone: '11988887777', relationship: 'Amigo' },
    { name: 'Ana Costa', phone: '11977776666', relationship: 'Conjuge' },
  ],
});

describe('DriversService', () => {
  let service: DriversService;

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ erro: false }),
    } as Response);

    service = new DriversService(new InMemoryDriversRepository(), new InMemoryDriverAuditLogRepository());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve criar motorista com status EM_ANALISE e detectar tipo de chave PIX', async () => {
    const result = await service.create(validPayload(), 'admin-1');

    expect(result.status).toBe(DriverStatus.EM_ANALISE);
    expect(result.pixKeyType).toBe('EMAIL');
    expect(result.contacts).toHaveLength(3);
    expect(result.cnh.expired).toBe(false);
  });

  it('deve rejeitar CPF invalido', async () => {
    await expect(service.create({ ...validPayload(), cpf: '11111111111' }, 'admin-1')).rejects.toThrow();
  });

  it('deve rejeitar PIS invalido', async () => {
    await expect(service.create({ ...validPayload(), pis: '12056275310' }, 'admin-1')).rejects.toThrow();
  });

  it('deve rejeitar CPF duplicado', async () => {
    await service.create(validPayload(), 'admin-1');
    await expect(service.create(validPayload(), 'admin-1')).rejects.toThrow();
  });

  it('deve rejeitar chave PIX nao reconhecida', async () => {
    await expect(service.create({ ...validPayload(), pixKey: 'chave-invalida' }, 'admin-1')).rejects.toThrow();
  });

  it('deve rejeitar CEP inexistente', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response);

    await expect(service.create(validPayload(), 'admin-1')).rejects.toThrow();
  });

  it('deve marcar cnh vencida como expired sem bloquear o cadastro', async () => {
    const result = await service.create({ ...validPayload(), cnhExpiresAt: '2020-01-01' }, 'admin-1');

    expect(result.cnh.expired).toBe(true);
    expect(result.status).toBe(DriverStatus.EM_ANALISE);
  });

  it('deve atualizar status do motorista', async () => {
    const created = await service.create(validPayload(), 'admin-1');

    const updated = await service.updateStatus(created.id, DriverStatus.APROVADO, 'admin-1');

    expect(updated.status).toBe(DriverStatus.APROVADO);
  });

  it('deve lancar NotFoundException ao atualizar status de motorista inexistente', async () => {
    await expect(service.updateStatus('missing-id', DriverStatus.APROVADO, 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve listar motoristas filtrando por status', async () => {
    const created = await service.create(validPayload(), 'admin-1');
    await service.updateStatus(created.id, DriverStatus.APROVADO, 'admin-1');

    const aprovados = await service.list(DriverStatus.APROVADO);
    const emAnalise = await service.list(DriverStatus.EM_ANALISE);

    expect(aprovados).toHaveLength(1);
    expect(emAnalise).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- drivers.service.spec.ts`
Expected: FAIL (`drivers.service` module not found).

- [ ] **Step 3: Implement `drivers.service.ts`**

```ts
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CnhCategory, DriverAuditAction, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import {
  DRIVER_AUDIT_LOG_REPOSITORY,
  DriverAuditLogRepository,
} from '@drivers/domain/repositories/driver-audit-log.repository';
import {
  DRIVERS_REPOSITORY,
  DriverWithContacts,
  DriversRepository,
} from '@drivers/domain/repositories/drivers.repository';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { isValidPis } from '@drivers/domain/validators/pis.validator';
import { detectPixKeyType, isValidPixKey } from '@drivers/domain/validators/pix-key.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';
import { UpdateDriverDto } from '@drivers/presentation/dtos/update-driver.dto';

export interface DriverResponse {
  id: string;
  fullName: string;
  cpf: string;
  pis: string;
  address: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  cnh: {
    number: string;
    category: CnhCategory;
    expiresAt: string;
    expired: boolean;
    hasImage: boolean;
  };
  pixKeyType: PixKeyType;
  pixKey: string;
  status: DriverStatus;
  contacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DriversService {
  constructor(
    @Inject(DRIVERS_REPOSITORY) private readonly driversRepository: DriversRepository,
    @Inject(DRIVER_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: DriverAuditLogRepository,
  ) {}

  async create(dto: CreateDriverDto, actorUserId: string): Promise<DriverResponse> {
    await this.assertCpfAvailable(dto.cpf);
    this.assertPisValid(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const id = randomUUID();
    const now = new Date();
    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      onlyDigits(dto.pis),
      dto.addressStreet,
      dto.addressNumber,
      dto.addressComplement ?? null,
      dto.addressNeighborhood,
      dto.addressCity,
      dto.addressState.toUpperCase(),
      onlyDigits(dto.addressZip),
      dto.cnhNumber,
      dto.cnhCategory,
      new Date(dto.cnhExpiresAt),
      null,
      pixKeyType,
      dto.pixKey.trim(),
      DriverStatus.EM_ANALISE,
      now,
      now,
    );
    const contacts = dto.contacts.map(
      (contact) =>
        new DriverReferenceContactEntity(randomUUID(), id, contact.name.trim(), onlyDigits(contact.phone), contact.relationship.trim()),
    );

    const saved = await this.driversRepository.create(driver, contacts);
    await this.logAction(id, DriverAuditAction.CREATED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async findById(id: string): Promise<DriverResponse> {
    const record = await this.driversRepository.findById(id);
    if (!record) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.toResponse(record);
  }

  async list(status?: DriverStatus): Promise<DriverResponse[]> {
    const records = await this.driversRepository.list(status);
    return records.map((record) => this.toResponse(record));
  }

  async update(id: string, dto: UpdateDriverDto, actorUserId: string): Promise<DriverResponse> {
    const existing = await this.driversRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }

    await this.assertCpfAvailable(dto.cpf, id);
    this.assertPisValid(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      onlyDigits(dto.pis),
      dto.addressStreet,
      dto.addressNumber,
      dto.addressComplement ?? null,
      dto.addressNeighborhood,
      dto.addressCity,
      dto.addressState.toUpperCase(),
      onlyDigits(dto.addressZip),
      dto.cnhNumber,
      dto.cnhCategory,
      new Date(dto.cnhExpiresAt),
      existing.driver.cnhImagePath,
      pixKeyType,
      dto.pixKey.trim(),
      existing.driver.status,
      existing.driver.createdAt,
      new Date(),
    );
    const contacts = dto.contacts.map(
      (contact) =>
        new DriverReferenceContactEntity(randomUUID(), id, contact.name.trim(), onlyDigits(contact.phone), contact.relationship.trim()),
    );

    const saved = await this.driversRepository.update(id, driver, contacts);
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async updateStatus(id: string, status: DriverStatus, actorUserId: string): Promise<DriverResponse> {
    const saved = await this.driversRepository.updateStatus(id, status);
    await this.logAction(id, DriverAuditAction.STATUS_CHANGED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async saveCnhImagePath(id: string, absolutePath: string, actorUserId: string): Promise<DriverResponse> {
    const saved = await this.driversRepository.saveCnhImagePath(id, absolutePath);
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, { cnhImageUpdated: true, driverId: id });
    return this.toResponse(saved);
  }

  async getCnhImagePath(id: string): Promise<string> {
    const record = await this.driversRepository.findById(id);
    if (!record || !record.driver.cnhImagePath) {
      throw new NotFoundException('Imagem da CNH nao cadastrada');
    }
    return record.driver.cnhImagePath;
  }

  private async assertCpfAvailable(cpf: string, ignoreId?: string): Promise<void> {
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF invalido');
    }

    const existing = await this.driversRepository.findByCpf(onlyDigits(cpf));
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um motorista cadastrado com este CPF');
    }
  }

  private assertPisValid(pis: string): void {
    if (!isValidPis(pis)) {
      throw new BadRequestException('PIS invalido');
    }
  }

  private detectAndValidatePixKey(pixKey: string): PixKeyType {
    const type = detectPixKeyType(pixKey);
    if (!type || !isValidPixKey(pixKey, type)) {
      throw new BadRequestException('Chave PIX invalida');
    }
    return type;
  }

  private async assertCepExists(rawCep: string): Promise<void> {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) {
      throw new BadRequestException('CEP deve conter 8 digitos');
    }

    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    } catch {
      throw new BadRequestException('Nao foi possivel validar o CEP informado');
    }

    if (!response.ok) {
      throw new BadRequestException('Nao foi possivel validar o CEP informado');
    }

    const data = (await response.json()) as { erro?: boolean };
    if (data.erro) {
      throw new BadRequestException('CEP nao encontrado');
    }
  }

  private async logAction(
    driverId: string,
    action: DriverAuditAction,
    actorUserId: string,
    snapshot: unknown,
  ): Promise<void> {
    await this.auditLogRepository.log(
      new DriverAuditLogEntity(
        randomUUID(),
        driverId,
        action,
        actorUserId,
        JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
        new Date(),
      ),
    );
  }

  private toResponse(record: DriverWithContacts): DriverResponse {
    const { driver, contacts } = record;
    return {
      id: driver.id,
      fullName: driver.fullName,
      cpf: driver.cpf,
      pis: driver.pis,
      address: {
        street: driver.addressStreet,
        number: driver.addressNumber,
        complement: driver.addressComplement,
        neighborhood: driver.addressNeighborhood,
        city: driver.addressCity,
        state: driver.addressState,
        zip: driver.addressZip,
      },
      cnh: {
        number: driver.cnhNumber,
        category: driver.cnhCategory,
        expiresAt: driver.cnhExpiresAt.toISOString().slice(0, 10),
        expired: driver.isCnhExpired(),
        hasImage: Boolean(driver.cnhImagePath),
      },
      pixKeyType: driver.pixKeyType,
      pixKey: driver.pixKey,
      status: driver.status,
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
      })),
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
```

Note: `assertCpfAvailable` dynamically imports `isValidCpf` to keep the diff self-contained per step — replace with a top-level `import { isValidCpf } from '@drivers/domain/validators/cpf.validator';` alongside the other imports instead; the dynamic import was only written that way here for narration and must not ship. Add it to the top import block and call `isValidCpf` directly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- drivers.service.spec.ts`
Expected: PASS, all 10 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/drivers/application
git commit -m "feat(drivers): add DriversService with CPF/PIS/PIX/CEP validation and audit logging"
```

---

## Task 6: Postgres repositories

**Files:**
- Create: `src/modules/drivers/infrastructure/repositories/postgres-drivers.repository.ts`
- Create: `src/modules/drivers/infrastructure/repositories/postgres-driver-audit-log.repository.ts`

**Interfaces:**
- Consumes: `DriverOrmEntity`, `DriverReferenceContactOrmEntity`, `DriverAuditLogOrmEntity` (Task 3); `DriversRepository`, `DriverAuditLogRepository`, `DriverWithContacts`, `DriverEntity`, `DriverReferenceContactEntity`, `DriverAuditLogEntity` (Task 2).
- Produces: `PostgresDriversRepository`, `PostgresDriverAuditLogRepository` classes — Task 7 (module wiring) references these class names directly.

- [ ] **Step 1: Implement `postgres-drivers.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import { DriverWithContacts, DriversRepository } from '@drivers/domain/repositories/drivers.repository';

@Injectable()
export class PostgresDriversRepository implements DriversRepository {
  constructor(
    @InjectRepository(DriverOrmEntity)
    private readonly driversRepository: Repository<DriverOrmEntity>,
    @InjectRepository(DriverReferenceContactOrmEntity)
    private readonly contactsRepository: Repository<DriverReferenceContactOrmEntity>,
  ) {}

  async create(
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    await this.driversRepository.save(this.driverToOrm(driver));
    await this.contactsRepository.save(contacts.map((contact) => this.contactToOrm(contact)));
    return this.mustFindById(driver.id);
  }

  async findById(id: string): Promise<DriverWithContacts | null> {
    const row = await this.driversRepository.findOne({ where: { id }, relations: ['contacts'] });
    return row ? this.toDomain(row) : null;
  }

  async findByCpf(cpf: string): Promise<DriverEntity | null> {
    const row = await this.driversRepository.findOne({ where: { cpf } });
    return row ? this.toDomain(row).driver : null;
  }

  async list(status?: DriverStatus): Promise<DriverWithContacts[]> {
    const rows = await this.driversRepository.find({
      where: status ? { status } : {},
      relations: ['contacts'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    const { id: _id, ...fields } = this.driverToOrm(driver);
    await this.driversRepository.update({ id }, fields);
    await this.contactsRepository.delete({ driverId: id });
    await this.contactsRepository.save(contacts.map((contact) => this.contactToOrm(contact)));
    return this.mustFindById(id);
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts> {
    await this.driversRepository.update({ id }, { status });
    return this.mustFindById(id);
  }

  async saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts> {
    await this.driversRepository.update({ id }, { cnhImagePath: imagePath });
    return this.mustFindById(id);
  }

  private async mustFindById(id: string): Promise<DriverWithContacts> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`Driver ${id} not found after write`);
    }
    return record;
  }

  private driverToOrm(driver: DriverEntity): DriverOrmEntity {
    return this.driversRepository.create({
      id: driver.id,
      userId: null,
      fullName: driver.fullName,
      cpf: driver.cpf,
      pis: driver.pis,
      addressStreet: driver.addressStreet,
      addressNumber: driver.addressNumber,
      addressComplement: driver.addressComplement,
      addressNeighborhood: driver.addressNeighborhood,
      addressCity: driver.addressCity,
      addressState: driver.addressState,
      addressZip: driver.addressZip,
      cnhNumber: driver.cnhNumber,
      cnhCategory: driver.cnhCategory,
      cnhExpiresAt: driver.cnhExpiresAt.toISOString().slice(0, 10),
      cnhImagePath: driver.cnhImagePath,
      pixKeyType: driver.pixKeyType,
      pixKey: driver.pixKey,
      status: driver.status,
    });
  }

  private contactToOrm(contact: DriverReferenceContactEntity): DriverReferenceContactOrmEntity {
    return this.contactsRepository.create({
      id: contact.id,
      driverId: contact.driverId,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });
  }

  private toDomain(row: DriverOrmEntity): DriverWithContacts {
    const driver = new DriverEntity(
      row.id,
      row.fullName,
      row.cpf,
      row.pis,
      row.addressStreet,
      row.addressNumber,
      row.addressComplement,
      row.addressNeighborhood,
      row.addressCity,
      row.addressState,
      row.addressZip,
      row.cnhNumber,
      row.cnhCategory,
      new Date(row.cnhExpiresAt),
      row.cnhImagePath,
      row.pixKeyType,
      row.pixKey,
      row.status,
      row.createdAt,
      row.updatedAt,
    );
    const contacts = (row.contacts ?? []).map(
      (contact) =>
        new DriverReferenceContactEntity(contact.id, contact.driverId, contact.name, contact.phone, contact.relationship),
    );
    return { driver, contacts };
  }
}
```

- [ ] **Step 2: Implement `postgres-driver-audit-log.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverAuditLogOrmEntity } from '@database/typeorm/entities/driver-audit-log.orm-entity';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverAuditLogRepository } from '@drivers/domain/repositories/driver-audit-log.repository';

@Injectable()
export class PostgresDriverAuditLogRepository implements DriverAuditLogRepository {
  constructor(
    @InjectRepository(DriverAuditLogOrmEntity)
    private readonly repository: Repository<DriverAuditLogOrmEntity>,
  ) {}

  async log(entry: DriverAuditLogEntity): Promise<void> {
    await this.repository.save(
      this.repository.create({
        id: entry.id,
        driverId: entry.driverId,
        action: entry.action,
        actorUserId: entry.actorUserId,
        payloadSnapshot: entry.payloadSnapshot,
      }),
    );
  }

  async listByDriver(driverId: string): Promise<DriverAuditLogEntity[]> {
    const rows = await this.repository.find({ where: { driverId }, order: { createdAt: 'DESC' } });
    return rows.map(
      (row) =>
        new DriverAuditLogEntity(row.id, row.driverId, row.action, row.actorUserId, row.payloadSnapshot, row.createdAt),
    );
  }
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/drivers/infrastructure/repositories/postgres-drivers.repository.ts src/modules/drivers/infrastructure/repositories/postgres-driver-audit-log.repository.ts
git commit -m "feat(drivers): add Postgres-backed repositories"
```

---

## Task 7: CNH image upload storage, controller, and module wiring

**Files:**
- Create: `src/modules/drivers/infrastructure/storage/cnh-image-storage.ts`
- Create: `src/modules/drivers/presentation/controllers/drivers.controller.ts`
- Create: `src/modules/drivers/drivers.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6 (`DriversService`, DTOs, repository tokens/classes, enums).
- Produces: HTTP API — `POST /drivers`, `GET /drivers`, `GET /drivers/:id`, `PATCH /drivers/:id`, `PATCH /drivers/:id/status`, `POST /drivers/:id/cnh-image`, `GET /drivers/:id/cnh-image`. This is the last backend task — the frontend tasks (8+) call these routes.

- [ ] **Step 1: Implement `cnh-image-storage.ts`**

```ts
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage, type FileFilterCallback } from 'multer';
import { extname, join } from 'path';

export const CNH_UPLOADS_DIR =
  process.env.DRIVER_CNH_UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'drivers', 'cnh');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const cnhImageUploadOptions = {
  storage: diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
      mkdirSync(CNH_UPLOADS_DIR, { recursive: true });
      callback(null, CNH_UPLOADS_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
      callback(null, `${req.params.id}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('Imagem deve ser JPEG, PNG ou WEBP'));
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};

export const mimeTypeFromPath = (path: string): string => {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
};
```

- [ ] **Step 2: Implement `drivers.controller.ts`**

```ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { cnhImageUploadOptions, mimeTypeFromPath } from '@drivers/infrastructure/storage/cnh-image-storage';
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';
import { UpdateDriverStatusDto } from '@drivers/presentation/dtos/update-driver-status.dto';
import { UpdateDriverDto } from '@drivers/presentation/dtos/update-driver.dto';

@ApiTags('Drivers')
@ApiBearerAuth('access-token')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DriversController {
  constructor(@Inject(DriversService) private readonly driversService: DriversService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar motorista' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDriverDto) {
    return this.driversService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar motoristas' })
  async list(@Query('status') status?: DriverStatus) {
    return this.driversService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar motorista' })
  async findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar cadastro do motorista' })
  async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto, req.user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Aprovar ou reprovar motorista' })
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, dto.status, req.user.sub);
  }

  @Post(':id/cnh-image')
  @UseInterceptors(FileInterceptor('file', cnhImageUploadOptions))
  @ApiOperation({ summary: 'Enviar imagem da CNH' })
  async uploadCnhImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem obrigatorio');
    }
    return this.driversService.saveCnhImagePath(id, file.path, req.user.sub);
  }

  @Get(':id/cnh-image')
  @ApiOperation({ summary: 'Baixar imagem da CNH' })
  async getCnhImage(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const imagePath = await this.driversService.getCnhImagePath(id);
    res.set({ 'Content-Type': mimeTypeFromPath(imagePath) });
    return new StreamableFile(createReadStream(imagePath));
  }
}
```

`getCnhImage` calls `DriversService.getCnhImagePath` (added in Task 5 Step 3) rather than `findById`, so the raw filesystem path never appears in `DriverResponse` — only this authenticated, ADMIN-only handler ever touches it.

- [ ] **Step 3: Implement `drivers.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DriverAuditLogOrmEntity,
  DriverOrmEntity,
  DriverReferenceContactOrmEntity,
} from '@database/typeorm/entities';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import {
  DRIVER_AUDIT_LOG_REPOSITORY,
} from '@drivers/domain/repositories/driver-audit-log.repository';
import { DRIVERS_REPOSITORY } from '@drivers/domain/repositories/drivers.repository';
import { InMemoryDriverAuditLogRepository } from '@drivers/infrastructure/repositories/in-memory-driver-audit-log.repository';
import { InMemoryDriversRepository } from '@drivers/infrastructure/repositories/in-memory-drivers.repository';
import { PostgresDriverAuditLogRepository } from '@drivers/infrastructure/repositories/postgres-driver-audit-log.repository';
import { PostgresDriversRepository } from '@drivers/infrastructure/repositories/postgres-drivers.repository';
import { DriversController } from '@drivers/presentation/controllers/drivers.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ...(isTest
      ? []
      : [
          TypeOrmModule.forFeature([
            DriverOrmEntity,
            DriverReferenceContactOrmEntity,
            DriverAuditLogOrmEntity,
          ]),
        ]),
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: DRIVERS_REPOSITORY,
      useClass: isTest ? InMemoryDriversRepository : PostgresDriversRepository,
    },
    {
      provide: DRIVER_AUDIT_LOG_REPOSITORY,
      useClass: isTest ? InMemoryDriverAuditLogRepository : PostgresDriverAuditLogRepository,
    },
  ],
  exports: [DriversService],
})
export class DriversModule {}
```

- [ ] **Step 4: Register `DriversModule` in `app.module.ts`**

Add `import { DriversModule } from '@modules/drivers/drivers.module';` and append `DriversModule,` to the `imports` array in `src/app.module.ts`.

- [ ] **Step 5: Manual end-to-end verification**

Run: `npm run start:dev` (ensure local Postgres is up and migrations from Task 3 are applied, and you have a valid ADMIN JWT — reuse the existing `/auth/login` flow to get one).

```bash
TOKEN="<admin jwt>"

curl -s -X POST http://localhost:3000/drivers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "fullName": "Joao da Silva Santos", "cpf": "52998224725", "pis": "12056275319",
    "addressStreet": "Rua das Flores", "addressNumber": "123", "addressNeighborhood": "Centro",
    "addressCity": "Sao Paulo", "addressState": "SP", "addressZip": "01310100",
    "cnhNumber": "123456789", "cnhCategory": "B", "cnhExpiresAt": "2028-05-01",
    "pixKey": "motorista@example.com",
    "contacts": [
      {"name": "Maria Silva", "phone": "11999998888", "relationship": "Irmao"},
      {"name": "Pedro Souza", "phone": "11988887777", "relationship": "Amigo"},
      {"name": "Ana Costa", "phone": "11977776666", "relationship": "Conjuge"}
    ]
  }'
```

Expected: `201` with a JSON body containing `"status":"EM_ANALISE"`, `"pixKeyType":"EMAIL"`, 3 contacts. Then `GET /drivers`, `GET /drivers/:id`, `PATCH /drivers/:id/status` with `{"status":"APROVADO"}`, and `POST /drivers/:id/cnh-image` (multipart with a small JPEG) followed by `GET /drivers/:id/cnh-image` to confirm the file streams back and lands under `uploads/drivers/cnh/` on disk.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including `validators.spec.ts` and `drivers.service.spec.ts` from earlier tasks.

- [ ] **Step 7: Commit**

```bash
git add src/modules/drivers src/app.module.ts
git commit -m "feat(drivers): add CNH image upload, controller and module wiring"
```

---

## Task 8: Frontend types

**Files:**
- Modify: `src/types/fleet.ts`
- Modify: `src/types/api.ts`

**Interfaces:**
- Produces: `Driver`, `DriverReferenceContact`, `DriverStatusValue`, `CnhCategoryValue`, `PixKeyTypeValue`, `CreateDriverPayload`, `UpdateDriverPayload` (fleet.ts — frontend-facing shape, keeps the field name `name` to avoid touching `FreightKanbanBoard.tsx`, `DREReport.tsx`, `FreightAdvancedFilters.tsx`, all of which already read `driver.name`); `CreateDriverRequest`, `UpdateDriverRequest`, `UpdateDriverStatusRequest`, `DriverResponse`, `DriverReferenceContactRequest`, `DriverReferenceContactResponse` (api.ts — mirrors the backend contract from Task 5/7 exactly). Task 9 (`driver-service.ts`) maps between these two shapes.

- [ ] **Step 1: Replace the `Driver` type in `src/types/fleet.ts`**

Remove the existing `DriverEmploymentType`, `Driver`, `CreateDriverPayload`, `UpdateDriverPayload` declarations and replace with:

```ts
export type DriverStatusValue = "EM_ANALISE" | "APROVADO" | "REPROVADO";
export type CnhCategoryValue = "A" | "B" | "C" | "D" | "E";
export type PixKeyTypeValue = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export interface DriverReferenceContact {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface Driver extends AuditableEntity {
  name: string;
  cpf: string;
  pis: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  cnhNumber: string;
  cnhCategory: CnhCategoryValue;
  cnhExpiresAt: string;
  cnhExpired: boolean;
  hasCnhImage: boolean;
  pixKeyType: PixKeyTypeValue;
  pixKey: string;
  status: DriverStatusValue;
  contacts: DriverReferenceContact[];
}

export interface CreateDriverPayload {
  name: string;
  cpf: string;
  pis: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  cnhNumber: string;
  cnhCategory: CnhCategoryValue;
  cnhExpiresAt: string;
  pixKey: string;
  contacts: DriverReferenceContact[];
}

export type UpdateDriverPayload = CreateDriverPayload;
```

Do not remove `AuditableEntity`, `DocumentAttachment`, or any other entity's types in this file — only the driver-related section changes.

- [ ] **Step 2: Add driver contracts to `src/types/api.ts`**

Append:

```ts
export type DriverStatus = "EM_ANALISE" | "APROVADO" | "REPROVADO";
export type CnhCategory = "A" | "B" | "C" | "D" | "E";
export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export interface DriverReferenceContactRequest {
  name: string;
  phone: string;
  relationship: string;
}

export interface DriverReferenceContactResponse extends DriverReferenceContactRequest {
  id: string;
}

export interface CreateDriverRequest {
  fullName: string;
  cpf: string;
  pis: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpiresAt: string;
  pixKey: string;
  contacts: DriverReferenceContactRequest[];
}

export type UpdateDriverRequest = CreateDriverRequest;

export interface UpdateDriverStatusRequest {
  status: DriverStatus;
}

export interface DriverResponse {
  id: string;
  fullName: string;
  cpf: string;
  pis: string;
  address: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  cnh: {
    number: string;
    category: CnhCategory;
    expiresAt: string;
    expired: boolean;
    hasImage: boolean;
  };
  pixKeyType: PixKeyType;
  pixKey: string;
  status: DriverStatus;
  contacts: DriverReferenceContactResponse[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`
Expected: errors in `AdminBaseOperacional.tsx`, `driver-service.ts`, `fleet-schemas.ts`, `fleet-options.ts`, `mock-repository.ts`'s driver usages and `Motoristas.tsx` (all fixed in Tasks 9–11) — no errors outside those files.

- [ ] **Step 4: Commit**

```bash
git add src/types/fleet.ts src/types/api.ts
git commit -m "feat(drivers): update frontend driver types to match new backend contract"
```

---

## Task 9: `br-validators.ts`, options, and `driverFormSchema`

**Files:**
- Create: `src/lib/br-validators.ts`
- Test: `src/lib/br-validators.test.ts`
- Modify: `src/lib/fleet-options.ts`
- Modify: `src/lib/fleet-schemas.ts`

**Interfaces:**
- Produces: `isValidCpf`, `isValidPis`, `detectPixKeyType`, `isValidPixKey` (br-validators.ts, client-side mirror of the Task 1 backend algorithms — used only for immediate form feedback, backend stays authoritative); `cnhCategoryOptions: Array<{value: CnhCategoryValue; label: string}>` (fleet-options.ts); `driverFormSchema` + `type DriverFormValues` (fleet-schemas.ts) — Task 11 (`DriverForm` component) consumes `DriverFormValues`.

- [ ] **Step 1: Write the failing validator tests**

Create `src/lib/br-validators.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectPixKeyType, isValidCpf, isValidPis, isValidPixKey } from "@/lib/br-validators";

describe("isValidCpf", () => {
  it("aceita CPF valido", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF invalido", () => {
    expect(isValidCpf("52998224700")).toBe(false);
  });
});

describe("isValidPis", () => {
  it("aceita PIS valido", () => {
    expect(isValidPis("12056275319")).toBe(true);
  });

  it("rejeita PIS invalido", () => {
    expect(isValidPis("12056275310")).toBe(false);
  });
});

describe("detectPixKeyType", () => {
  it("detecta email", () => {
    expect(detectPixKeyType("motorista@example.com")).toBe("EMAIL");
  });

  it("retorna null para formato desconhecido", () => {
    expect(detectPixKeyType("abc")).toBeNull();
  });
});

describe("isValidPixKey", () => {
  it("valida chave email", () => {
    expect(isValidPixKey("motorista@example.com", "EMAIL")).toBe(true);
  });

  it("rejeita CPF com digitos verificadores errados como chave", () => {
    expect(isValidPixKey("11111111111", "CPF")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- br-validators.test.ts`
Expected: FAIL (`@/lib/br-validators` not found).

- [ ] **Step 3: Implement `br-validators.ts`**

```ts
import type { CnhCategoryValue, PixKeyTypeValue } from "@/types/fleet";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const calcCheckDigit = (base: number[]): number => {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCpf = (rawCpf: string): boolean => {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  const digits = cpf.split("").map(Number);
  const first = calcCheckDigit(digits.slice(0, 9));
  const second = calcCheckDigit([...digits.slice(0, 9), first]);
  return first === digits[9] && second === digits[10];
};

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const calcCnpjCheckDigit = (base: number[], weights: number[]): number => {
  const sum = base.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = (rawCnpj: string): boolean => {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  const digits = cnpj.split("").map(Number);
  const first = calcCnpjCheckDigit(digits.slice(0, 12), CNPJ_FIRST_WEIGHTS);
  const second = calcCnpjCheckDigit([...digits.slice(0, 12), first], CNPJ_SECOND_WEIGHTS);
  return first === digits[12] && second === digits[13];
};

const PIS_WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const isValidPis = (rawPis: string): boolean => {
  const pis = onlyDigits(rawPis);
  if (pis.length !== 11 || /^(\d)\1{10}$/.test(pis)) {
    return false;
  }
  const digits = pis.split("").map(Number);
  const sum = digits.slice(0, 10).reduce((acc, digit, index) => acc + digit * PIS_WEIGHTS[index], 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  return checkDigit === digits[10];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RANDOM_KEY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const detectPixKeyType = (rawKey: string): PixKeyTypeValue | null => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  if (EMAIL_REGEX.test(key)) return "EMAIL";
  if (RANDOM_KEY_REGEX.test(key)) return "RANDOM";
  if (key.startsWith("+") && digits.length >= 12 && digits.length <= 13) return "PHONE";
  if (digits.length === 11) return "CPF";
  if (digits.length === 14) return "CNPJ";
  return null;
};

export const isValidPixKey = (rawKey: string, type: PixKeyTypeValue): boolean => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  switch (type) {
    case "EMAIL":
      return EMAIL_REGEX.test(key);
    case "RANDOM":
      return RANDOM_KEY_REGEX.test(key);
    case "PHONE":
      return key.startsWith("+") && digits.length >= 12 && digits.length <= 13;
    case "CPF":
      return digits.length === 11 && isValidCpf(digits);
    case "CNPJ":
      return digits.length === 14 && isValidCnpj(digits);
    default:
      return false;
  }
};

export type { CnhCategoryValue };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- br-validators.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `cnhCategoryOptions` to `src/lib/fleet-options.ts`**

```ts
import type { CnhCategoryValue } from "@/types/fleet";

export const cnhCategoryOptions: Array<{ value: CnhCategoryValue; label: string }> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
];
```

Remove the now-unused `driverEmploymentOptions` export (and its `DriverEmploymentType` import) — nothing outside `AdminBaseOperacional.tsx` used it, and Task 11 removes its usage there.

- [ ] **Step 6: Rewrite `driverFormSchema` in `src/lib/fleet-schemas.ts`**

Replace the existing `driverFormSchema`/`DriverFormValues` with:

```ts
import { detectPixKeyType, isValidCpf, isValidPis, isValidPixKey } from "@/lib/br-validators";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{2}9?\d{8}$/, "Telefone invalido. Use DDD + numero.");

const contactSchema = z.object({
  name: requiredString("Informe o nome do contato.").min(3, "Nome muito curto."),
  phone: phoneSchema,
  relationship: requiredString("Informe o grau de relacao."),
});

export const driverFormSchema = z.object({
  name: requiredString("Informe o nome completo.")
    .min(5, "Nome deve ter ao menos 5 caracteres.")
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espacos."),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "CPF deve conter 11 digitos.")
    .refine(isValidCpf, "CPF invalido."),
  pis: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "PIS deve conter 11 digitos.")
    .refine(isValidPis, "PIS invalido."),
  addressStreet: requiredString("Informe a rua."),
  addressNumber: requiredString("Informe o numero."),
  addressComplement: z.string().trim().optional(),
  addressNeighborhood: requiredString("Informe o bairro."),
  addressCity: requiredString("Informe a cidade."),
  addressState: requiredString("Informe o estado.").regex(/^[A-Za-z]{2}$/, "UF invalida."),
  addressZip: requiredString("Informe o CEP.").regex(/^\d{8}$/, "CEP deve conter 8 digitos."),
  cnhNumber: requiredString("Informe o numero da CNH."),
  cnhCategory: z.enum(enumValues(cnhCategoryOptions)),
  cnhExpiresAt: requiredString("Informe a validade da CNH."),
  cnhImage: z.any().optional(),
  pixKey: requiredString("Informe a chave PIX.").refine((value) => {
    const type = detectPixKeyType(value);
    return type !== null && isValidPixKey(value, type);
  }, "Chave PIX invalida."),
  contacts: z.tuple([contactSchema, contactSchema, contactSchema]),
});
export type DriverFormValues = z.infer<typeof driverFormSchema>;
```

Add `cnhCategoryOptions` to the existing `import { ... } from "@/lib/fleet-options"` line at the top of the file, and remove `driverEmploymentOptions` from it.

- [ ] **Step 7: Verify it builds**

Run: `npx tsc --noEmit`
Expected: remaining errors are confined to `AdminBaseOperacional.tsx`, `driver-service.ts`, `mock-repository.ts`, `Motoristas.tsx` (fixed in Tasks 10–11).

- [ ] **Step 8: Commit**

```bash
git add src/lib/br-validators.ts src/lib/br-validators.test.ts src/lib/fleet-options.ts src/lib/fleet-schemas.ts
git commit -m "feat(drivers): add client-side CPF/PIS/PIX validators and rewrite driverFormSchema"
```

---

## Task 10: `http-client.ts` FormData support + `driver-service.ts`

**Files:**
- Modify: `src/lib/http-client.ts`
- Modify: `src/services/fleet/driver-service.ts`
- Modify: `src/services/fleet/seed.ts`

**Interfaces:**
- Consumes: `DriverResponse`, `CreateDriverRequest`, `UpdateDriverStatusRequest` (Task 8 api.ts); `Driver`, `CreateDriverPayload`, `UpdateDriverPayload`, `DriverStatusValue` (Task 8 fleet.ts); `apiRequest` (existing http-client.ts).
- Produces: `driverService` with methods `getDrivers()`, `getDriver(id)`, `createDriver(payload)`, `updateDriver(id, payload)`, `updateDriverStatus(id, status)`, `uploadCnhImage(id, file)` — Task 11 (`AdminBaseOperacional.tsx`) calls these exact method names.

- [ ] **Step 1: Make `apiRequest` skip the forced JSON content-type for `FormData` bodies**

In `src/lib/http-client.ts`, inside `apiRequest`, change:

```ts
  const requestHeaders = sanitizeHeaders({
    "Content-Type": "application/json",
    ...(headers || {}),
  });
```

to:

```ts
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const requestHeaders = sanitizeHeaders({
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(headers || {}),
  });
```

This lets the browser set the correct `multipart/form-data; boundary=...` header itself when a caller passes a `FormData` body — required for CNH image upload. Every existing JSON caller is unaffected (their `body` is a string, not `FormData`).

- [ ] **Step 2: Rewrite `driver-service.ts`**

```ts
import { apiRequest } from "@/lib/http-client";
import type {
  CreateDriverRequest,
  DriverResponse,
  UpdateDriverStatusRequest,
} from "@/types/api";
import type {
  CreateDriverPayload,
  Driver,
  DriverStatusValue,
  UpdateDriverPayload,
} from "@/types/fleet";

const toDriver = (response: DriverResponse): Driver => ({
  id: response.id,
  name: response.fullName,
  cpf: response.cpf,
  pis: response.pis,
  addressStreet: response.address.street,
  addressNumber: response.address.number,
  addressComplement: response.address.complement,
  addressNeighborhood: response.address.neighborhood,
  addressCity: response.address.city,
  addressState: response.address.state,
  addressZip: response.address.zip,
  cnhNumber: response.cnh.number,
  cnhCategory: response.cnh.category,
  cnhExpiresAt: response.cnh.expiresAt,
  cnhExpired: response.cnh.expired,
  hasCnhImage: response.cnh.hasImage,
  pixKeyType: response.pixKeyType,
  pixKey: response.pixKey,
  status: response.status,
  contacts: response.contacts,
  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
});

const toRequest = (payload: CreateDriverPayload): CreateDriverRequest => ({
  fullName: payload.name,
  cpf: payload.cpf,
  pis: payload.pis,
  addressStreet: payload.addressStreet,
  addressNumber: payload.addressNumber,
  addressComplement: payload.addressComplement,
  addressNeighborhood: payload.addressNeighborhood,
  addressCity: payload.addressCity,
  addressState: payload.addressState,
  addressZip: payload.addressZip,
  cnhNumber: payload.cnhNumber,
  cnhCategory: payload.cnhCategory,
  cnhExpiresAt: payload.cnhExpiresAt,
  pixKey: payload.pixKey,
  contacts: payload.contacts,
});

export const driverService = {
  async getDrivers(): Promise<Driver[]> {
    const response = await apiRequest<DriverResponse[]>("/drivers");
    return response.map(toDriver);
  },

  async getDriver(id: string): Promise<Driver> {
    const response = await apiRequest<DriverResponse>(`/drivers/${id}`);
    return toDriver(response);
  },

  async createDriver(payload: CreateDriverPayload): Promise<Driver> {
    const response = await apiRequest<DriverResponse>("/drivers", {
      method: "POST",
      body: JSON.stringify(toRequest(payload)),
    });
    return toDriver(response);
  },

  async updateDriver(id: string, payload: UpdateDriverPayload): Promise<Driver> {
    const response = await apiRequest<DriverResponse>(`/drivers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(toRequest(payload)),
    });
    return toDriver(response);
  },

  async updateDriverStatus(id: string, status: DriverStatusValue): Promise<Driver> {
    const request: UpdateDriverStatusRequest = { status };
    const response = await apiRequest<DriverResponse>(`/drivers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(request),
    });
    return toDriver(response);
  },

  async uploadCnhImage(id: string, file: File): Promise<Driver> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiRequest<DriverResponse>(`/drivers/${id}/cnh-image`, {
      method: "POST",
      body: formData,
    });
    return toDriver(response);
  },
};
```

- [ ] **Step 3: Remove the driver seed from `seed.ts`**

Delete the `driversSeed` export and its `Driver` import in `src/services/fleet/seed.ts` — it was only consumed by the mock repository this task just replaced, and its shape no longer matches the new `Driver` type.

- [ ] **Step 4: Verify it builds**

Run: `npx tsc --noEmit`
Expected: remaining errors confined to `AdminBaseOperacional.tsx` and `Motoristas.tsx` (Task 11 fixes the former, Task 12 deletes the latter).

- [ ] **Step 5: Commit**

```bash
git add src/lib/http-client.ts src/services/fleet/driver-service.ts src/services/fleet/seed.ts
git commit -m "feat(drivers): connect driver-service to the real backend API"
```

---

## Task 11: `DriverForm`, driver columns, and status actions in `AdminBaseOperacional.tsx`

**Files:**
- Modify: `src/components/admin/AdminCrudTable.tsx`
- Modify: `src/pages/AdminBaseOperacional.tsx`

**Interfaces:**
- Consumes: `DriverFormValues` (Task 9), `driverService` (Task 10), `Driver`/`DriverReferenceContact`/`CreateDriverPayload`/`UpdateDriverPayload`/`DriverStatusValue` (Task 8), `cnhCategoryOptions` (Task 9).

- [ ] **Step 1: Make `AdminCrudTable`'s delete action optional**

In `src/components/admin/AdminCrudTable.tsx`, change the prop type:

```ts
  onDelete?: (row: T) => void;
```

and wrap the delete button so it only renders when the prop is provided:

```tsx
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(row)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      {onDelete ? (
                        <Button variant="ghost" size="icon" onClick={() => onDelete(row)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
```

This is a backward-compatible change — the other 7 entity tables in `AdminBaseOperacional.tsx` keep passing `onDelete` and render unchanged; only the drivers table will omit it (Step 6 below), since the API has no delete endpoint for drivers by design (status covers the lifecycle instead).

- [ ] **Step 2: Update imports in `AdminBaseOperacional.tsx`**

Replace:

```ts
import {
  cargoTypeOptions,
  driverEmploymentOptions,
  freightStatusOptions,
  optionLabel,
  vehicleStatusOptions,
  vehicleTypeOptions,
} from "@/lib/fleet-options";
```

with:

```ts
import {
  cargoTypeOptions,
  cnhCategoryOptions,
  freightStatusOptions,
  optionLabel,
  vehicleStatusOptions,
  vehicleTypeOptions,
} from "@/lib/fleet-options";
```

Update the `CreateDriverPayload`/`Driver`/`UpdateDriverPayload` import line (already correct names, no change needed since Task 8 kept the same type names). Add `driverStatusLabel` and `driverStatusVariant` helpers near the top of the file (next to `fileCountLabel`):

```ts
const driverStatusLabel = (status: Driver["status"]) =>
  ({ EM_ANALISE: "Em análise", APROVADO: "Aprovado", REPROVADO: "Reprovado" })[status];

const driverStatusVariant = (status: Driver["status"]): "secondary" | "default" | "destructive" =>
  ({ EM_ANALISE: "secondary" as const, APROVADO: "default" as const, REPROVADO: "destructive" as const })[status];
```

- [ ] **Step 3: Add a status-update mutation next to `driversCrud`**

Right after the existing `const driversCrud = useFleetCrud<Driver, CreateDriverPayload, UpdateDriverPayload>(...)` block (around line 793), add:

```ts
  const driverStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Driver["status"] }) =>
      driverService.updateDriverStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
      toast({ title: "Status atualizado", description: "Situação do motorista alterada com sucesso." });
    },
  });
```

- [ ] **Step 4: Rewrite `driverColumns`**

Replace the existing `driverColumns` array (around line 1018) with:

```ts
  const driverColumns: AdminTableColumn<Driver>[] = [
    { header: "Nome", cell: (driver) => <span className="font-semibold">{driver.name}</span> },
    { header: "CPF", cell: (driver) => driver.cpf },
    { header: "CNH", cell: (driver) => `${driver.cnhNumber} (${driver.cnhCategory})` },
    {
      header: "Validade CNH",
      cell: (driver) => (
        <span className={driver.cnhExpired ? "text-destructive font-medium" : undefined}>
          {formatDate(driver.cnhExpiresAt)}
          {driver.cnhExpired ? " (vencida)" : ""}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (driver) => (
        <div className="flex items-center gap-2">
          <Badge variant={driverStatusVariant(driver.status)}>{driverStatusLabel(driver.status)}</Badge>
          {driver.status !== "APROVADO" ? (
            <Button
              variant="ghost"
              size="icon"
              title="Aprovar"
              onClick={() => driverStatusMutation.mutate({ id: driver.id, status: "APROVADO" })}
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
          {driver.status !== "REPROVADO" ? (
            <Button
              variant="ghost"
              size="icon"
              title="Reprovar"
              onClick={() => driverStatusMutation.mutate({ id: driver.id, status: "REPROVADO" })}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
```

Add `Check, X` to the `lucide-react` import at the top of the file (find the existing `lucide-react` import — if none exists yet at file top, add `import { Check, X } from "lucide-react";`).

- [ ] **Step 5: Update the `drivers` filtered-rows `useMemo` and remove the employment filter**

Replace (around line 933):

```ts
  const drivers = useMemo(() => {
    const search = normalize(driverSearch);
    return driversCrud.rows.filter((driver) => {
      const matchesSearch = [driver.name, driver.cnh, driver.phone].some((value) =>
        normalize(value).includes(search)
      );
      const matchesEmployment =
        driverEmployment === "ALL" || driver.employmentType === driverEmployment;
      return matchesSearch && matchesEmployment;
    });
  }, [driverEmployment, driverSearch, driversCrud.rows]);
```

with:

```ts
  const drivers = useMemo(() => {
    const search = normalize(driverSearch);
    return driversCrud.rows.filter((driver) =>
      [driver.name, driver.cpf, driver.cnhNumber].some((value) => normalize(value).includes(search))
    );
  }, [driverSearch, driversCrud.rows]);
```

Remove the now-unused `driverEmployment`/`setDriverEmployment` state declaration and the `<FilterSelect ... options={driverEmploymentOptions} />` block inside the drivers `<TabsContent>` (the `filters` prop) — driver status filtering happens visually via the status column now, not a dropdown filter.

- [ ] **Step 6: Update the drivers `AdminCrudTable` usage to drop `onDelete`**

In the drivers `<TabsContent>` block (around line 1125), remove the `onDelete={(driver) => removeWithConfirmation(...)}` prop entirely (per Step 1, omitting it hides the delete button) and remove the now-unused `filters` prop's `FilterSelect` (per Step 5).

- [ ] **Step 7: Rewrite `DriverForm`**

Replace the entire `DriverForm` component (lines 337-413) with:

```tsx
const DriverForm = ({
  driver,
  isSaving,
  onCancel,
  onSubmit,
  onUploadCnhImage,
}: {
  driver: Driver | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateDriverPayload) => Promise<void>;
  onUploadCnhImage: (file: File) => Promise<void>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    values: {
      name: driver?.name || "",
      cpf: driver?.cpf || "",
      pis: driver?.pis || "",
      addressStreet: driver?.addressStreet || "",
      addressNumber: driver?.addressNumber || "",
      addressComplement: driver?.addressComplement || "",
      addressNeighborhood: driver?.addressNeighborhood || "",
      addressCity: driver?.addressCity || "",
      addressState: driver?.addressState || "",
      addressZip: driver?.addressZip || "",
      cnhNumber: driver?.cnhNumber || "",
      cnhCategory: driver?.cnhCategory || "B",
      cnhExpiresAt: driver?.cnhExpiresAt || "",
      cnhImage: undefined,
      pixKey: driver?.pixKey || "",
      contacts: [
        driver?.contacts[0] || { name: "", phone: "", relationship: "" },
        driver?.contacts[1] || { name: "", phone: "", relationship: "" },
        driver?.contacts[2] || { name: "", phone: "", relationship: "" },
      ],
    },
  });

  const submit = async (values: DriverFormValues) => {
    await onSubmit({
      name: values.name.trim(),
      cpf: values.cpf.trim(),
      pis: values.pis.trim(),
      addressStreet: values.addressStreet.trim(),
      addressNumber: values.addressNumber.trim(),
      addressComplement: values.addressComplement?.trim() || undefined,
      addressNeighborhood: values.addressNeighborhood.trim(),
      addressCity: values.addressCity.trim(),
      addressState: values.addressState.trim().toUpperCase(),
      addressZip: values.addressZip.trim(),
      cnhNumber: values.cnhNumber.trim(),
      cnhCategory: values.cnhCategory,
      cnhExpiresAt: values.cnhExpiresAt,
      pixKey: values.pixKey.trim(),
      contacts: values.contacts,
    });

    const imageList = getFileList(values.cnhImage);
    const imageFile = imageList?.[0];
    if (imageFile) {
      await onUploadCnhImage(imageFile);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Nome completo" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Nome completo" />
        </AdminField>
        <AdminField label="CPF" error={errors.cpf?.message}>
          <Input {...register("cpf")} placeholder="Somente numeros" maxLength={11} />
        </AdminField>
        <AdminField label="PIS" error={errors.pis?.message}>
          <Input {...register("pis")} placeholder="Somente numeros" maxLength={11} />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Rua" error={errors.addressStreet?.message}>
          <Input {...register("addressStreet")} />
        </AdminField>
        <AdminField label="Numero" error={errors.addressNumber?.message}>
          <Input {...register("addressNumber")} />
        </AdminField>
        <AdminField label="Complemento (opcional)">
          <Input {...register("addressComplement")} />
        </AdminField>
        <AdminField label="Bairro" error={errors.addressNeighborhood?.message}>
          <Input {...register("addressNeighborhood")} />
        </AdminField>
        <AdminField label="Cidade" error={errors.addressCity?.message}>
          <Input {...register("addressCity")} />
        </AdminField>
        <AdminField label="Estado (UF)" error={errors.addressState?.message}>
          <Input {...register("addressState")} maxLength={2} />
        </AdminField>
        <AdminField label="CEP" error={errors.addressZip?.message}>
          <Input {...register("addressZip")} placeholder="Somente numeros" maxLength={8} />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Numero da CNH" error={errors.cnhNumber?.message}>
          <Input {...register("cnhNumber")} />
        </AdminField>
        <AdminField label="Categoria CNH" error={errors.cnhCategory?.message}>
          <select className="border rounded-md h-10 px-3" {...register("cnhCategory")}>
            {cnhCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Validade CNH" error={errors.cnhExpiresAt?.message}>
          <Input type="date" {...register("cnhExpiresAt")} />
        </AdminField>
        <AdminField label="Imagem da CNH (opcional)">
          <Input type="file" accept="image/jpeg,image/png,image/webp" {...register("cnhImage")} />
        </AdminField>
      </div>

      <AdminField label="Chave PIX" error={errors.pixKey?.message}>
        <Input {...register("pixKey")} placeholder="CPF, CNPJ, email, telefone ou chave aleatoria" />
      </AdminField>

      <div className="space-y-3">
        <p className="text-sm font-medium">Contatos de referência (3 obrigatórios)</p>
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-3 rounded-md border p-3">
            <AdminField label="Nome" error={errors.contacts?.[index]?.name?.message}>
              <Input {...register(`contacts.${index}.name` as const)} />
            </AdminField>
            <AdminField label="Telefone" error={errors.contacts?.[index]?.phone?.message}>
              <Input {...register(`contacts.${index}.phone` as const)} placeholder="DDD + numero" />
            </AdminField>
            <AdminField label="Grau de relação" error={errors.contacts?.[index]?.relationship?.message}>
              <Input {...register(`contacts.${index}.relationship` as const)} />
            </AdminField>
          </div>
        ))}
      </div>

      <AdminFormActions isSubmitting={isSaving} onCancel={onCancel} />
    </form>
  );
};
```

- [ ] **Step 8: Wire the new `onUploadCnhImage` prop at the `DriverForm` call site**

Replace the `<DriverForm ... />` usage (around line 1316) with:

```tsx
        <DriverForm
          driver={editingDriver}
          isSaving={driversCrud.isSaving}
          onCancel={() => setDriverDialogOpen(false)}
          onSubmit={async (payload) => {
            if (editingDriver) {
              await driversCrud.update({ id: editingDriver.id, payload });
            } else {
              await driversCrud.create(payload);
            }
            setDriverDialogOpen(false);
          }}
          onUploadCnhImage={async (file) => {
            if (editingDriver) {
              await driverService.uploadCnhImage(editingDriver.id, file);
              await queryClient.invalidateQueries({ queryKey: queryKeys.drivers });
            }
          }}
        />
```

Note: for a brand-new driver, the CNH image is only uploaded on a follow-up edit (the id doesn't exist until `driversCrud.create` resolves and the dialog has already closed) — this matches the spec's "upload opcional" requirement without adding a two-step create-then-immediately-reopen flow. If the admin attaches an image while creating, it's silently skipped for a new record; document this in the field label as "Imagem da CNH (opcional, edite o motorista após criar para anexar)" instead of the plain label used in Step 7 if you want to avoid confusion — optional polish, not required by the spec.

- [ ] **Step 9: Remove the leftover `firstFileToAttachment` import if now unused**

`AdminBaseOperacional.tsx` imports `{ firstFileToAttachment, filesToAttachments }` from `mock-repository.ts` for vehicle/refueling document handling — those stay in use by other tabs, so keep the import; only drop it if a build check shows it's fully unused (it won't be, vehicles/refueling still use it).

- [ ] **Step 10: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no errors anywhere except `src/pages/Motoristas.tsx` (deleted in Task 12).

- [ ] **Step 11: Manual browser verification**

Run: `npm run dev` (frontend) and `npm run start:dev` (backend) together, with `VITE_API_BASE_URL` pointed at the local backend.

- Open `/admin/base-operacional`, go to the "Motoristas" tab.
- Create a driver with valid CPF `52998224725`, PIS `12056275319`, CEP `01310100`, 3 contacts, PIX email — confirm it saves and appears with badge "Em análise".
- Try an invalid CPF — confirm the field-level error shows and the form doesn't submit.
- Edit the driver, attach a CNH image, save — confirm no crash (image upload runs as a second request after the PATCH).
- Click the approve (check) icon — confirm the badge flips to "Aprovado" and the icon disappears.

- [ ] **Step 12: Commit**

```bash
git add src/components/admin/AdminCrudTable.tsx src/pages/AdminBaseOperacional.tsx
git commit -m "feat(drivers): rewrite DriverForm and driver table for the new cadastro fields"
```

---

## Task 12: Remove the orphan mock page

**Files:**
- Delete: `src/pages/Motoristas.tsx`

**Interfaces:**
- None — this file was confirmed unreferenced by any router, layout, or component during planning (Task 8's `git grep` check covers the same ground; re-verify here since new commits may have changed that).

- [ ] **Step 1: Confirm it's still unreferenced**

Run: `grep -rn "Motoristas" src/App.tsx src/components/AppLayout.tsx` and `grep -rln "pages/Motoristas" src`
Expected: no matches (the file's own path in the grep target doesn't count).

- [ ] **Step 2: Delete the file**

Run: `git rm src/pages/Motoristas.tsx`

- [ ] **Step 3: Verify it builds and tests pass**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(drivers): remove orphan mock Motoristas.tsx page"
```

---

## Final Verification

- [ ] Backend: `npm test` and `npx tsc --noEmit -p tsconfig.json` both pass in `backend-truck`.
- [ ] Frontend: `npm test`, `npx tsc --noEmit`, and `npm run build` all pass in `front-end-truck`.
- [ ] Manual smoke test from Task 11 Step 11 repeated once more end-to-end after all tasks land.
