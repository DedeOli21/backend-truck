# Plano — Módulo "Meios de Pagamento" (Fin Admin)

## 1. Modelo de dados (backend)

### Decisões dos gaps
- **Placa/RNTRC**: snapshot desnormalizado na própria entidade de pagamento (histórico imutável).
  Fonte: placa via `trucks.driverId` (→ `users.id`, ligado por `drivers.userId`); RNTRC via
  nova coluna `rntrc varchar(20) NULL` em `trucks` (migration). NÃO adicionar `vehicleId`/`rntrc`
  em `Driver` (evita acoplamento duplo com `trucks.driverId`).
- **Datas**: `loadingDate`/`deliveryDate` são campos próprios do pagamento, desacoplados de
  `Freight` (que não tem backend).
- **Pedágio**: campo isolado (`tollAmount` + `tollStatus`) — não cria `FreightExpense`.
- **PIX**: reusa `pixKeyType`/`pixKey` do driver como default, copiado e editável no pagamento.

### Entidade `DriverPayment` (tabela `driver_payments`)
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| driverId | uuid FK `drivers` | obrigatório |
| driverName | varchar(160) | snapshot, obrigatório |
| vehiclePlate | varchar(20) NULL | snapshot |
| rntrc | varchar(20) NULL | snapshot |
| pixKeyType | enum `PixKeyType` NULL | editável |
| pixKey | varchar(120) | obrigatório, default do driver |
| baseAmount | numeric(12,2) | > 0, obrigatório |
| inssAmount | numeric(12,2) | calculado backend |
| sestSenatAmount | numeric(12,2) | calculado backend |
| tollAmount | numeric(12,2) | default 0 |
| totalAmount | numeric(12,2) | calculado backend |
| tollStatus | enum `TollStatus`: PAID / UNPAID | default UNPAID |
| paymentStatus | enum `DriverPaymentStatus`: PENDING / PAID | default PENDING |
| paidAt | timestamptz NULL | |
| loadingDate | date | obrigatório |
| deliveryDate | date | obrigatório, ≥ loadingDate |
| clientName | varchar(160) | obrigatório |
| createdByUserId | uuid | do JWT |
| createdAt / updatedAt | timestamptz | |

### Auditoria `driver_payment_audit_logs` (espelha `driver_audit_logs`)
- id, driverPaymentId, action (`CREATED|UPDATED|PAYMENT_EXECUTED|DELETED`), actorUserId,
  payloadSnapshot jsonb, createdAt.

## 2. Endpoints REST (ADMIN only, JwtAuthGuard + RolesGuard, @Throttle como payables)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/driver-payments` | Lista com filtros query: `driverId`, `plate`, `client`, `tollStatus`, `paymentStatus`, `dateFrom`, `dateTo`, `dateField=loading|delivery` |
| GET | `/driver-payments/:id` | Detalhe |
| POST | `/driver-payments` | Cria (recalcula tudo, snapshot driver/veículo, log `CREATED`) |
| PATCH | `/driver-payments/:id` | Edita (recalcula, log `UPDATED`) |
| PATCH | `/driver-payments/:id/pay` | Marca pago + `paidAt` (log `PAYMENT_EXECUTED`) |
| DELETE | `/driver-payments/:id` | Exclui (log `DELETED`) |
| GET | `/driver-payments/driver-context/:driverId` | Retorna `{driverName, plate, rntrc, pixKey, pixKeyType}` para preenchimento automático |

Reusa `GET /drivers` existente para o dropdown.

## 3. Cálculos — backend é fonte de verdade
Serviço recalcula em create/update (ignora valores enviados de inss/sest/total). Fórmulas literais da US:
- `inss = round(baseAmount × 0.09, 2)`
- `sestSenat = round(baseAmount × 0.00016, 2)` — literal da US (0,016%); alíquota oficial real é 1,5%+0,5%. Alíquotas em constantes únicas (`DRIVER_PAYMENT_RATES`) para ajuste futuro.
- `total = baseAmount + inss + sestSenat + tollAmount` (soma, conforme US)
- Frontend replica as fórmulas em função pura `calculateDriverPayment()` (`src/lib/driver-payment-calc.ts`) apenas para exibição em tempo real; backend persiste os valores.

## 4. Frontend
- `DriverPaymentsPanel.tsx` (`src/components/financeiro/`): form em Card (Select motorista → auto-fill
  placa/RNTRC/PIX via `driver-context`; inputs numéricos valor/pedágio; cálculo reativo; datas
  DD/MM/AAAA com validação `deliveryDate ≥ loadingDate`; cliente obrigatório; status pedágio;
  resumo com total antes de salvar; bloqueio de salvar conforme critérios) + tabela com filtros
  (motorista, placa, cliente, status pedágio, período) + ações editar/pagar/excluir.
- Integração em `AdminFinancialModule.tsx`: `<TabsTrigger value="driver-payments">Meios de Pagamento</TabsTrigger>`
  + `<TabsContent value="driver-payments"><DriverPaymentsPanel /></TabsContent>` (queries React Query próprias no painel, sem tocar nos mocks existentes).

## 5. Arquivos

### Criar — backend (`backend-truck/src/`)
- `database/typeorm/entities/driver-payment.orm-entity.ts`
- `database/typeorm/entities/driver-payment-audit-log.orm-entity.ts`
- `database/typeorm/migrations/1760300000000-AddDriverPayments.ts` (tabelas novas + `trucks.rntrc`)
- `modules/driver-payments/domain/entities/driver-payment.entity.ts`
- `modules/driver-payments/domain/repositories/driver-payments.repository.ts`
- `modules/driver-payments/application/services/driver-payments.service.ts` + `.spec.ts`
- `modules/driver-payments/infrastructure/repositories/postgres-driver-payments.repository.ts`
- `modules/driver-payments/infrastructure/repositories/in-memory-driver-payments.repository.ts`
- `modules/driver-payments/presentation/controllers/driver-payments.controller.ts`
- `modules/driver-payments/presentation/dtos/create-driver-payment.dto.ts`, `update-driver-payment.dto.ts`, `list-driver-payments-query.dto.ts`
- `modules/driver-payments/driver-payments.module.ts`

### Editar — backend
- `database/typeorm/entities/enums.ts` (`TollStatus`, `DriverPaymentStatus`, `DriverPaymentAuditAction`)
- `database/typeorm/entities/index.ts` (exports)
- `database/typeorm/entities/truck.orm-entity.ts` (`rntrc`)
- `database/typeorm/data-source.ts` (registrar entidades)
- `app.module.ts` (`DriverPaymentsModule`)

### Criar — frontend (`front-end-truck/src/`)
- `types/driver-payment.ts`
- `services/driver-payments-service.ts` (padrão `payables-service.ts` + `apiRequest`)
- `lib/driver-payment-calc.ts`
- `components/financeiro/DriverPaymentsPanel.tsx`

### Editar — frontend
- `pages/AdminFinancialModule.tsx` (nova aba)

## 6. Critérios de aceite → implementação (1:1)
| Critério US | Item do plano |
|---|---|
| Puxar motorista, placa, RNTRC, PIX ao selecionar | `GET /driver-payments/driver-context/:driverId` + auto-fill no panel (§4) |
| Cálculos automáticos em tempo real | `calculateDriverPayment()` reativo no form (§3) |
| Total exibido antes de salvar | Resumo no Card do form (§4) |
| Impedir salvar sem motorista/valor/datas válidas/cliente | Validação no form + DTOs/Service backend (§2, §4) |
| Status do pedágio no resumo/lista | `tollStatus` na tabela e no resumo (§1, §4) |
| Editar registro posteriormente | `PATCH /driver-payments/:id` + ação de edição (§2, §4) |
| Logs de criação, edição e pagamento | `driver_payment_audit_logs` (§1) |
| Filtros: motorista, placa, cliente, status pedágio, período | Query params do `GET /driver-payments` (§2) |

## Validação
- Backend: `npm run build` + `npm test` (spec do service com in-memory repo) + migration gerada/executada.
- Frontend: `npm run build` (ou `tsc --noEmit`).
