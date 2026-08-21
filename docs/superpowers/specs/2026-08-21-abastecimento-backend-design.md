# Abastecimento com backend real — Design

Data: 2026-08-21
Status: aprovado, pronto para plano de implementação

## Contexto

A tela de Abastecimento do frontend (`AdminAbastecimento.tsx`) não tinha
persistência nenhuma: o submit exibia um toast de sucesso e a listagem lia um
array fixo de módulo. O PR #4 do frontend corrigiu o defeito ligando a tela aos
services mock (`createMockRepository`, agora com persistência em `localStorage`),
mas os dados continuam no navegador do usuário — não vão ao banco nem são
compartilhados entre usuários.

Estado do backend hoje:

- Tabela `trucks` existe desde a migration inicial (`id`, `plate`, `brand_model`,
  `year`, `driver_id`, timestamps), **sem módulo, sem controller e sem dados**.
  A FK `driver_id` aponta para `users(id)`, o que está errado desde que os
  motoristas passaram a viver na tabela `drivers`.
- Não existe tabela de abastecimento nem de gasto variável.
- `POST /transactions/fuel` existe, mas é lançamento financeiro (`amount` +
  `description`) atrelado ao usuário logado. Não tem veículo, litros nem
  odômetro, e não serve para o histórico operacional.
- O módulo `drivers` já é consumido pelo frontend via `apiRequest` e é o padrão
  arquitetural a seguir.

## Objetivo

Remover o mock da tela de Abastecimento, com dados no Postgres da VPS. Como o
histórico da tela combina abastecimentos, gastos variáveis, veículos e
motoristas, e só motoristas é real hoje, o escopo cobre também veículos e
gastos variáveis.

## Decisões de escopo (confirmadas com o usuário)

- Escopo: abastecimento + gasto variável + veículos.
- Veículos entram com **CRUD completo**, ampliando a tabela `trucks`. Isso
  também tira o mock da aba Veículos de `AdminBaseOperacional`.
- Permissões: ADMIN lança e enxerga tudo; motorista lança apenas para si e
  enxerga apenas o próprio histórico.
- Entrega em **três PRs sequenciais** (veículos → abastecimento → gasto
  variável), cada um subindo backend e frontend juntos.
- Anexos (comprovante de abastecimento, documentos do veículo) ficam **fora**
  desta leva. O upload de CNH usa storage próprio (`cnh-image-storage.ts`) e
  replicá-lo triplicaria o trabalho. O botão de anexo sai da tela por ora.
- Dinheiro em `numeric(n,2)`, seguindo `transactions.amount` e `driver_payments`.
  (Centavos em `integer` foi considerado e descartado por divergir do repo.)
- Gasto variável é entidade própria, separada de `transactions`.

## Arquitetura

Três módulos irmãos de `drivers`, cada um com a estrutura já usada no repo:

```
src/modules/<modulo>/
  domain/entities/            <entidade>.entity.ts
  domain/repositories/        <modulo>.repository.ts        (porta + token DI)
  application/services/       <modulo>.service.ts (+ .spec.ts)
  infrastructure/repositories/ postgres-<modulo>.repository.ts
                               in-memory-<modulo>.repository.ts
  presentation/controllers/   <modulo>.controller.ts
  presentation/dtos/          create-*.dto.ts, update-*.dto.ts
  <modulo>.module.ts
```

`InMemory*` é o repositório usado quando `NODE_ENV === 'test'`, como em
`drivers.module.ts`. Guards `JwtAuthGuard` + `RolesGuard` no controller.

Migrations rodam automaticamente no start do container
(`docker-entrypoint.sh:22`), então cada PR carrega a sua.

## PR 1 — Veículos

### Migration `AddTruckDetails`

```sql
ALTER TABLE trucks
  ADD COLUMN type varchar(20) NOT NULL DEFAULT 'TRUCK',
  ADD COLUMN capacity numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ATIVO';
```

`type`: `TRUCK | CARRETA | BITREM | VAN`. `status`: `ATIVO | MANUTENCAO | INATIVO`.
`capacity` em toneladas.

A FK `fk_trucks_driver` passa de `users(id)` para `drivers(id)`. Antes do
`ALTER`, o script zera `driver_id` que não exista em `drivers`, de forma que a
migration funcione tanto com a tabela vazia (caso provável em produção) quanto
com dados legados.

`down` reverte as três colunas e devolve a FK para `users(id)`.

### Endpoints

Todos sob `JwtAuthGuard`. `@Roles('ADMIN')` em tudo, exceto `GET /trucks`, que
também aceita motorista — é dependência do lançamento de abastecimento.

| Método | Rota | Observação |
|---|---|---|
| `POST` | `/trucks` | cadastro |
| `GET` | `/trucks` | filtro opcional `?status=` |
| `GET` | `/trucks/:id` | |
| `PATCH` | `/trucks/:id` | edição parcial |
| `DELETE` | `/trucks/:id` | |

`plate` é única no banco. Violação de unicidade vira `409 Conflict` com
mensagem tratada, nunca 500.

### Frontend

`vehicleService` mantém as cinco funções atuais e troca `createMockRepository`
por `apiRequest`, no molde de `driverService`. `TruckResponse` entra em
`types/api.ts` com um `toVehicle()` de mapeamento. `vehiclesSeed` e a chave de
mock `vehicles` são removidas. O campo `documents` sai do tipo `Vehicle`.

A aba Veículos de `AdminBaseOperacional` passa a operar sobre dados reais sem
alteração de JSX.

### Testes

`trucks.service.spec.ts` sobre o repositório in-memory: criação, placa
duplicada, filtro por status, atualização parcial, remoção, não-encontrado.

## PR 2 — Abastecimento

### Migration `AddRefuelings`

```sql
CREATE TABLE refuelings (
  id uuid PRIMARY KEY,
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  liters numeric(10,3) NOT NULL,
  price_per_liter numeric(10,3) NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  odometer integer NOT NULL,
  gas_station_name varchar(150),
  refueled_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_refuelings_liters_positive CHECK (liters > 0),
  CONSTRAINT chk_refuelings_total_positive CHECK (total_amount > 0)
);
CREATE INDEX idx_refuelings_truck_odometer ON refuelings (truck_id, odometer);
```

`total_amount` é gravado, não derivado. A tela captura litros e valor pago; o
preço por litro é que sai da divisão. Guardar o total evita erro de
arredondamento na soma dos KPIs. O índice `(truck_id, odometer)` é o acesso do
cálculo de consumo.

### Endpoints

`POST /refuelings`, `GET /refuelings` (filtros `truckId`, `driverId`, `from`,
`to`), `GET /refuelings/:id`, `PATCH /refuelings/:id`, `DELETE /refuelings/:id`.

Regra de acesso resolvida no service a partir de `req.user.sub`, nunca a partir
do corpo da requisição:

- ADMIN: irrestrito.
- Motorista: `POST` grava com o `driverId` dele, ignorando o que vier no corpo;
  `GET` filtra pelo dele; `PATCH`/`DELETE` só em registro próprio, senão `403`.

### Frontend

`refuelingService` passa a chamar a API. O cálculo de consumo médio vive em
`lib/operational-expenses.ts` (delta de odômetro por veículo, ignorando o
primeiro abastecimento de cada um) e já é coberto por testes — passa a operar
sobre dados reais sem alteração.

`DriverAbastecimento.tsx`, que hoje tem o mesmo defeito de não gravar, passa a
lançar pelo endpoint. O veículo vem de `GET /trucks`; o motorista é o próprio
usuário, resolvido no backend.

## PR 3 — Gasto variável

### Migration `AddVehicleExpenses`

```sql
CREATE TABLE vehicle_expenses (
  id uuid PRIMARY KEY,
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  category varchar(20) NOT NULL,
  description varchar(255),
  amount numeric(12,2) NOT NULL,
  spent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_vehicle_expenses_amount_positive CHECK (amount > 0)
);
```

`category`: `BORRACHARIA | PEDAGIO | MANUTENCAO | OUTROS`.

Endpoints e regra de acesso idênticos aos de abastecimento, em
`/vehicle-expenses`.

## Erros

DTOs com `class-validator`, como nos módulos atuais. O frontend traduz via
`getFriendlyErrorMessage`; verificar se ele cobre `409`, que hoje pode não
aparecer em nenhum fluxo.

## Deploy

Cada PR sobe por `deploy_vps.py` / `deploy-to-vps.sh` e as migrations rodam no
start do container. O agente não tem acesso SSH à VPS: o deploy é executado pelo
usuário.

## Ordem e dependências

PR 1 obrigatoriamente antes dos outros dois — as FKs de `refuelings` e
`vehicle_expenses` dependem de `trucks` já ajustada. PR 2 e PR 3 são
independentes entre si.

## Fora de escopo

- Anexos e upload de comprovante.
- Fretes, clientes, fornecedores e rotas, que continuam mock no frontend.
- Relatórios e exportação de despesas operacionais.
