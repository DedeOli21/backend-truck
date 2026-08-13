import { NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { AuthService } from '@applications/auth/application/services/auth.service';
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

    const authServiceMock = {
      upsertDriverCredentials: jest.fn().mockImplementation(async (_driverId: string, name: string, email: string, _password: string) => ({
        id: 'user-driver-1',
        name,
        email,
        role: 'DRIVER',
        driverId: _driverId,
      })),
    } as unknown as AuthService;

    service = new DriversService(
      new InMemoryDriversRepository(),
      new InMemoryDriverAuditLogRepository(),
      authServiceMock,
    );
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

  it('deve definir acesso e aprovar um motorista', async () => {
    const created = await service.create(validPayload(), 'admin-1');

    const approved = await service.defineDriverAccess(
      created.id,
      'motorista@empresa.com',
      'senha123',
      'admin-1',
    );

    expect(approved.status).toBe(DriverStatus.APROVADO);
    expect(approved.hasAccess).toBe(true);
    expect(approved.approvedByUserId).toBe('admin-1');
  });

  it('deve lancar NotFoundException ao definir acesso de motorista inexistente', async () => {
    await expect(
      service.defineDriverAccess('missing-id', 'x@y.com', 'senha123', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
