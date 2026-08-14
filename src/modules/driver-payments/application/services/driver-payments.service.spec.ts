import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriverPaymentStatus, PixKeyType, TollStatus } from '@database/typeorm/entities/enums';
import { DriverPaymentsService } from '@applications/driver-payments/application/services/driver-payments.service';
import { InMemoryDriverPaymentAuditLogRepository } from '@driver-payments/infrastructure/repositories/in-memory-driver-payment-audit-log.repository';
import { InMemoryDriverPaymentsRepository } from '@driver-payments/infrastructure/repositories/in-memory-driver-payments.repository';
import { CreateDriverPaymentDto } from '@driver-payments/presentation/dtos/create-driver-payment.dto';

const DRIVER_ID = '11111111-1111-1111-1111-111111111111';

const validPayload = (): CreateDriverPaymentDto => ({
  driverId: DRIVER_ID,
  baseAmount: 1000,
  tollAmount: 50,
  tollStatus: TollStatus.UNPAID,
  loadingDate: '2026-08-10',
  deliveryDate: '2026-08-12',
  clientName: 'Cliente Teste LTDA',
});

describe('DriverPaymentsService', () => {
  let service: DriverPaymentsService;
  let repository: InMemoryDriverPaymentsRepository;
  let auditLogRepository: InMemoryDriverPaymentAuditLogRepository;

  const seedContext = () => {
    repository.seedContext(DRIVER_ID, {
      driverName: 'Joao da Silva',
      pixKey: 'joao@example.com',
      pixKeyType: PixKeyType.EMAIL,
      vehiclePlate: 'ABC1D23',
      rntrc: '12345678901',
    });
  };

  beforeEach(() => {
    repository = new InMemoryDriverPaymentsRepository();
    auditLogRepository = new InMemoryDriverPaymentAuditLogRepository();
    service = new DriverPaymentsService(repository, auditLogRepository);
  });

  it('deve calcular INSS, SEST/SENAT e total automaticamente', async () => {
    seedContext();

    const result = await service.create(validPayload(), 'admin-1');

    expect(result.baseAmount).toBe(1000);
    expect(result.inssAmount).toBe(22);
    expect(result.sestSenatAmount).toBe(5);
    expect(result.totalAmount).toBe(1077);
  });

  it('deve puxar automaticamente motorista, placa, RNTRC e PIX', async () => {
    seedContext();

    const result = await service.create(validPayload(), 'admin-1');

    expect(result.driverName).toBe('Joao da Silva');
    expect(result.vehiclePlate).toBe('ABC1D23');
    expect(result.rntrc).toBe('12345678901');
    expect(result.pixKey).toBe('joao@example.com');
    expect(result.pixKeyType).toBe(PixKeyType.EMAIL);
  });

  it('deve permitir editar a chave PIX', async () => {
    seedContext();
    const created = await service.create(validPayload(), 'admin-1');

    const updated = await service.update(created.id, { ...validPayload(), pixKey: 'novo@example.com' }, 'admin-1');

    expect(updated.pixKey).toBe('novo@example.com');
    expect(updated.pixKeyType).toBe(PixKeyType.EMAIL);
  });

  it('deve marcar pagamento como pago e registrar log', async () => {
    seedContext();
    const created = await service.create(validPayload(), 'admin-1');

    const paid = await service.markPaid(created.id, 'admin-1');

    expect(paid.paymentStatus).toBe(DriverPaymentStatus.PAID);
    expect(paid.paidAt).toBeTruthy();
    expect(auditLogRepository.findAll()).toHaveLength(2);
  });

  it('deve rejeitar entrega anterior ao carregamento', async () => {
    seedContext();

    await expect(
      service.create({ ...validPayload(), deliveryDate: '2026-08-09' }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar motorista inexistente', async () => {
    await expect(service.create(validPayload(), 'admin-1')).rejects.toThrow(NotFoundException);
  });

  it('deve filtrar por status do pedagio e cliente', async () => {
    seedContext();
    await service.create(validPayload(), 'admin-1');
    await service.create(
      { ...validPayload(), tollStatus: TollStatus.PAID, clientName: 'Outro Cliente' },
      'admin-1',
    );

    const unpaid = await service.list({ tollStatus: TollStatus.UNPAID });
    const byClient = await service.list({ client: 'Outro' });

    expect(unpaid).toHaveLength(1);
    expect(byClient).toHaveLength(1);
    expect(byClient[0].clientName).toBe('Outro Cliente');
  });

  it('deve excluir pagamento e registrar log', async () => {
    seedContext();
    const created = await service.create(validPayload(), 'admin-1');

    await service.remove(created.id, 'admin-1');

    await expect(service.findById(created.id)).rejects.toThrow(NotFoundException);
    expect(auditLogRepository.findAll()).toHaveLength(2);
  });
});
