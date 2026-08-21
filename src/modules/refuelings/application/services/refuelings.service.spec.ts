import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { RefuelingsService } from '@refuelings/application/services/refuelings.service';
import { InMemoryRefuelingsRepository } from '@refuelings/infrastructure/repositories/in-memory-refuelings.repository';

const ADMIN = { userId: 'user-admin', role: 'ADMIN' as const };
const DRIVER = { userId: 'user-driver', role: 'DRIVER' as const };
const SEM_CADASTRO = { userId: 'user-sem-motorista', role: 'DRIVER' as const };

const DRIVER_ID = 'driver-1';
const OUTRO_DRIVER_ID = 'driver-2';
const TRUCK_ID = 'truck-1';

const baseDto = {
  truckId: TRUCK_ID,
  liters: 100,
  totalAmount: 700,
  odometer: 10000,
  refueledAt: '2026-08-10T08:00:00.000Z',
};

describe('RefuelingsService', () => {
  let repository: InMemoryRefuelingsRepository;
  let service: RefuelingsService;

  beforeEach(() => {
    repository = new InMemoryRefuelingsRepository();
    const driversService = {
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

    service = new RefuelingsService(repository, driversService, trucksService);
  });

  it('admin grava o motorista informado no corpo', async () => {
    const created = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);
    expect(created.driverId).toBe(OUTRO_DRIVER_ID);
  });

  it('admin sem motorista informado recebe BadRequest', async () => {
    await expect(service.create({ ...baseDto }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('motorista lanca sempre para si, ignorando o driverId do corpo', async () => {
    const created = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, DRIVER);
    expect(created.driverId).toBe(DRIVER_ID);
  });

  it('usuario motorista sem cadastro em drivers recebe Forbidden', async () => {
    await expect(service.create({ ...baseDto }, SEM_CADASTRO)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('calcula o preco por litro a partir do total pago', async () => {
    const created = await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    expect(created.pricePerLiter).toBe(7);
    expect(created.totalAmount).toBe(700);
  });

  it('admin lista tudo e motorista so o proprio, mesmo pedindo o de outro', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);

    expect(await service.list({}, ADMIN)).toHaveLength(2);

    const doMotorista = await service.list({ driverId: OUTRO_DRIVER_ID }, DRIVER);
    expect(doMotorista).toHaveLength(1);
    expect(doMotorista[0].driverId).toBe(DRIVER_ID);
  });

  it('filtra por veiculo e por intervalo de datas', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create(
      { ...baseDto, driverId: DRIVER_ID, truckId: 'truck-2', refueledAt: '2026-08-20T08:00:00.000Z' },
      ADMIN,
    );

    expect(await service.list({ truckId: 'truck-2' }, ADMIN)).toHaveLength(1);
    expect(await service.list({ from: '2026-08-15T00:00:00.000Z' }, ADMIN)).toHaveLength(1);
    expect(await service.list({ to: '2026-08-15T00:00:00.000Z' }, ADMIN)).toHaveLength(1);
  });

  it('ordena do mais recente para o mais antigo', async () => {
    await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    await service.create(
      { ...baseDto, driverId: DRIVER_ID, refueledAt: '2026-08-25T08:00:00.000Z' },
      ADMIN,
    );

    const lista = await service.list({}, ADMIN);
    expect(lista[0].refueledAt).toBe('2026-08-25T08:00:00.000Z');
  });

  it('motorista nao edita nem remove lancamento de outro', async () => {
    const deOutro = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);

    await expect(service.update(deOutro.id, { odometer: 1 }, DRIVER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(deOutro.id, DRIVER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findById(deOutro.id, DRIVER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('motorista edita o proprio lancamento', async () => {
    const meu = await service.create({ ...baseDto }, DRIVER);
    const editado = await service.update(meu.id, { odometer: 12345 }, DRIVER);

    expect(editado.odometer).toBe(12345);
  });

  it('recalcula o preco por litro quando litros ou total mudam', async () => {
    const created = await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);
    const editado = await service.update(created.id, { totalAmount: 900 }, ADMIN);

    expect(editado.pricePerLiter).toBe(9);
  });

  it('admin remove qualquer lancamento', async () => {
    const created = await service.create({ ...baseDto, driverId: OUTRO_DRIVER_ID }, ADMIN);
    await service.remove(created.id, ADMIN);

    expect(await service.list({}, ADMIN)).toHaveLength(0);
  });

  it('recusa lancamento em veiculo inexistente com NotFound', async () => {
    await expect(
      service.create({ ...baseDto, truckId: 'truck-fantasma', driverId: DRIVER_ID }, ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recusa edicao apontando para veiculo inexistente', async () => {
    const created = await service.create({ ...baseDto, driverId: DRIVER_ID }, ADMIN);

    await expect(
      service.update(created.id, { truckId: 'truck-fantasma' }, ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanca NotFound para id inexistente', async () => {
    const id = '00000000-0000-0000-0000-000000000000';

    await expect(service.findById(id, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(id, { odometer: 1 }, ADMIN)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(id, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });
});
