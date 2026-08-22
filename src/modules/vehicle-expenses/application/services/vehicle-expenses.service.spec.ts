import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { VehicleExpensesService } from '@vehicle-expenses/application/services/vehicle-expenses.service';
import { InMemoryVehicleExpensesRepository } from '@vehicle-expenses/infrastructure/repositories/in-memory-vehicle-expenses.repository';

const ADMIN = { userId: 'user-admin', role: 'ADMIN' as const };
const GESTOR = ADMIN.userId;
const DRIVER = { userId: 'user-driver', role: 'DRIVER' as const };
const SEM_CADASTRO = { userId: 'user-sem-motorista', role: 'DRIVER' as const };

const DRIVER_ID = 'driver-1';
const OUTRO_DRIVER_ID = 'driver-2';
const TRUCK_ID = 'truck-1';

const baseDto = {
  truckId: TRUCK_ID,
  category: VehicleExpenseCategory.PEDAGIO,
  description: 'Praça Anhanguera',
  amount: 380,
  spentAt: '2026-08-10T08:00:00.000Z',
};

describe('VehicleExpensesService', () => {
  let repository: InMemoryVehicleExpensesRepository;
  let service: VehicleExpensesService;

  beforeEach(() => {
    repository = new InMemoryVehicleExpensesRepository();

    const driversService = {
      // ADMIN é dono de si; o motorista do teste pertence a esse mesmo gestor.
      escopoDoUsuario: jest.fn(async (userId: string, role: 'ADMIN' | 'DRIVER') =>
        role === 'ADMIN' ? userId : GESTOR,
      ),
      findIdByUserId: jest.fn(async (userId: string) =>
        userId === DRIVER.userId ? DRIVER_ID : null,
      ),
    } as unknown as DriversService;

    const trucksService = {
      findById: jest.fn(async (id: string) => {
        if (id !== TRUCK_ID && id !== 'truck-2') {
          throw new NotFoundException('Veículo não encontrado.');
        }
        return { id };
      }),
    } as unknown as TrucksService;

    service = new VehicleExpensesService(repository, driversService, trucksService);
  });

  it('admin grava o motorista informado', async () => {
    const created = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);
    expect(created.driverId).toBe(OUTRO_DRIVER_ID);
    expect(created.amount).toBe(380);
  });

  it('admin sem motorista informado recebe BadRequest', async () => {
    await expect(service.create({ ...baseDto }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('motorista lanca para si, ignorando o driverId do corpo', async () => {
    const created = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, DRIVER);
    expect(created.driverId).toBe(DRIVER_ID);
  });

  it('usuario motorista sem cadastro recebe Forbidden', async () => {
    await expect(service.create({ ...baseDto }, SEM_CADASTRO)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('recusa veiculo inexistente com NotFound', async () => {
    await expect(
      service.create({ ...baseDto, truckId: 'truck-fantasma', driverId: DRIVER_ID }, ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('admin lista tudo e motorista so o proprio', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);

    expect(await service.list({}, ADMIN)).toHaveLength(2);

    const doMotorista = await service.list({ driverId: OUTRO_DRIVER_ID }, DRIVER);
    expect(doMotorista).toHaveLength(1);
    expect(doMotorista[0].driverId).toBe(DRIVER_ID);
  });

  it('filtra por categoria', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create(
      { ...baseDto, driverId: DRIVER_ID, category: VehicleExpenseCategory.BORRACHARIA },
      ADMIN,
    );

    const borracharia = await service.list(
      { category: VehicleExpenseCategory.BORRACHARIA },
      ADMIN,
    );
    expect(borracharia).toHaveLength(1);
  });

  it('ordena do mais recente para o mais antigo', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create(
      { ...baseDto, driverId: DRIVER_ID, spentAt: '2026-08-25T08:00:00.000Z' },
      ADMIN,
    );

    const lista = await service.list({}, ADMIN);
    expect(lista[0].spentAt).toBe('2026-08-25T08:00:00.000Z');
  });

  it('motorista nao mexe em gasto de outro', async () => {
    const deOutro = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);

    await expect(service.update(deOutro.id, { amount: 1 }, DRIVER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(deOutro.id, DRIVER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findById(deOutro.id, DRIVER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('motorista edita o proprio gasto', async () => {
    const meu = await service.create({ ...baseDto }, DRIVER);
    const editado = await service.update(meu.id, { amount: 500 }, DRIVER);

    expect(editado.amount).toBe(500);
  });

  it('lanca NotFound para id inexistente', async () => {
    const id = '00000000-0000-0000-0000-000000000000';

    await expect(service.findById(id, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(id, { amount: 1 }, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(id, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });
});
