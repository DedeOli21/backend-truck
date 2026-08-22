import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DriverPaymentAuditAction,
  DriverPaymentStatus,
  PixKeyType,
  TollStatus,
} from '@database/typeorm/entities/enums';
import { DriverPaymentAuditLogEntity } from '@driver-payments/domain/entities/driver-payment-audit-log.entity';
import { DriverPaymentEntity } from '@driver-payments/domain/entities/driver-payment.entity';
import {
  DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY,
  DRIVER_PAYMENTS_REPOSITORY,
  DriverPaymentAuditLogRepository,
  DriverPaymentContext,
  DriverPaymentFilters,
  DriverPaymentsRepository,
} from '@driver-payments/domain/repositories/driver-payments.repository';
import { detectPixKeyType } from '@drivers/domain/validators/pix-key.validator';
import { CreateDriverPaymentDto } from '@driver-payments/presentation/dtos/create-driver-payment.dto';

export const DRIVER_PAYMENT_RATES = {
  BASE_PERCENT: 0.2, // 20% — base de cálculo comum (INSS e SEST/SENAT) sobre o valor digitável
  INSS_RATE: 0.11, // 11% — alíquota do INSS sobre a base de cálculo
  SEST_SENAT_RATE: 0.025, // 2,5% — alíquota do SEST/SENAT sobre a base de cálculo
} as const;

export interface DriverPaymentResponse {
  id: string;
  driverId: string;
  driverName: string;
  vehiclePlate: string | null;
  rntrc: string | null;
  pixKeyType: PixKeyType | null;
  pixKey: string;
  baseAmount: number;
  inssAmount: number;
  sestSenatAmount: number;
  tollAmount: number;
  totalAmount: number;
  tollStatus: TollStatus;
  paymentStatus: DriverPaymentStatus;
  paidAt: string | null;
  loadingDate: string;
  deliveryDate: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class DriverPaymentsService {
  private readonly logger = new Logger(DriverPaymentsService.name);

  constructor(
    @Inject(DRIVER_PAYMENTS_REPOSITORY)
    private readonly repository: DriverPaymentsRepository,
    @Inject(DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: DriverPaymentAuditLogRepository,
  ) {}

  async create(dto: CreateDriverPaymentDto, actorUserId: string): Promise<DriverPaymentResponse> {
    const context = await this.assertDriverContext(dto.driverId, actorUserId);
    this.assertDatesValid(dto.loadingDate, dto.deliveryDate);

    const baseAmount = this.normalizeAmount(dto.baseAmount, 'Valor digitavel');
    const tollAmount = this.normalizeAmount(dto.tollAmount ?? 0, 'Pedagio', { allowZero: true });
    const { inss, sestSenat, total } = this.calculateTotals(baseAmount, tollAmount);
    const { pixKey, pixKeyType } = this.resolvePix(dto.pixKey, dto.pixKeyType, context);

    const id = randomUUID();
    const now = new Date();
    const payment = new DriverPaymentEntity(
      id,
      dto.driverId,
      context.driverName,
      context.vehiclePlate,
      context.rntrc,
      pixKeyType,
      pixKey,
      baseAmount,
      inss,
      sestSenat,
      tollAmount,
      total,
      dto.tollStatus ?? TollStatus.UNPAID,
      DriverPaymentStatus.PENDING,
      null,
      new Date(dto.loadingDate),
      new Date(dto.deliveryDate),
      dto.clientName.trim(),
      actorUserId,
      now,
      now,
      // Quem lança é o gestor dono do pagamento.
      actorUserId,
    );

    const saved = await this.repository.create(payment);
    await this.logAction(saved.id, DriverPaymentAuditAction.CREATED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async list(filters: DriverPaymentFilters): Promise<DriverPaymentResponse[]> {
    const items = await this.repository.list(filters);
    return items.map((item) => this.toResponse(item));
  }

  async findById(id: string, ownerUserId?: string): Promise<DriverPaymentResponse> {
    const payment = await this.repository.findById(id, ownerUserId);
    if (!payment) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    return this.toResponse(payment);
  }

  async update(
    id: string,
    dto: CreateDriverPaymentDto,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverPaymentResponse> {
    const existing = await this.repository.findById(id, ownerUserId);
    if (!existing) {
      throw new NotFoundException('Pagamento nao encontrado');
    }

    const context = await this.assertDriverContext(dto.driverId, actorUserId);
    this.assertDatesValid(dto.loadingDate, dto.deliveryDate);

    const baseAmount = this.normalizeAmount(dto.baseAmount, 'Valor digitavel');
    const tollAmount = this.normalizeAmount(dto.tollAmount ?? 0, 'Pedagio', { allowZero: true });
    const { inss, sestSenat, total } = this.calculateTotals(baseAmount, tollAmount);
    const { pixKey, pixKeyType } = this.resolvePix(dto.pixKey, dto.pixKeyType, context);

    const payment = new DriverPaymentEntity(
      existing.id,
      dto.driverId,
      context.driverName,
      context.vehiclePlate,
      context.rntrc,
      pixKeyType,
      pixKey,
      baseAmount,
      inss,
      sestSenat,
      tollAmount,
      total,
      dto.tollStatus ?? TollStatus.UNPAID,
      existing.paymentStatus,
      existing.paidAt,
      new Date(dto.loadingDate),
      new Date(dto.deliveryDate),
      dto.clientName.trim(),
      existing.createdByUserId,
      existing.createdAt,
      new Date(),
      existing.ownerUserId,
    );

    const saved = await this.repository.update(payment);
    await this.logAction(saved.id, DriverPaymentAuditAction.UPDATED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async markPaid(
    id: string,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverPaymentResponse> {
    // findById com o dono derruba com 404 o pagamento de outro gestor.
    await this.findById(id, ownerUserId);
    const saved = await this.repository.markPaid(id, new Date());
    await this.logAction(saved.id, DriverPaymentAuditAction.PAYMENT_EXECUTED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async remove(id: string, actorUserId: string, ownerUserId?: string): Promise<void> {
    const existing = await this.repository.findById(id, ownerUserId);
    if (!existing) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    const snapshot = this.toResponse(existing);
    await this.repository.remove(id);
    await this.logAction(id, DriverPaymentAuditAction.DELETED, actorUserId, snapshot);
  }

  async getDriverContext(driverId: string, ownerUserId?: string): Promise<DriverPaymentContext> {
    return this.assertDriverContext(driverId, ownerUserId);
  }

  private async assertDriverContext(
    driverId: string,
    ownerUserId?: string,
  ): Promise<DriverPaymentContext> {
    // Motorista de outro gestor não é encontrado.
    const context = await this.repository.resolveDriverContext(driverId, ownerUserId);
    if (!context) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return context;
  }

  private assertDatesValid(loadingDate: string, deliveryDate: string): void {
    const loading = new Date(loadingDate);
    const delivery = new Date(deliveryDate);

    if (Number.isNaN(loading.getTime())) {
      throw new BadRequestException('Data de carregamento invalida');
    }
    if (Number.isNaN(delivery.getTime())) {
      throw new BadRequestException('Data de entrega invalida');
    }
    if (delivery.getTime() < loading.getTime()) {
      throw new BadRequestException('Data de entrega deve ser igual ou posterior a data de carregamento');
    }
  }

  private normalizeAmount(
    value: number,
    label: string,
    options: { allowZero?: boolean } = {},
  ): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(`${label} deve ser um numero valido`);
    }
    if (options.allowZero ? value < 0 : value <= 0) {
      throw new BadRequestException(`${label} deve ser maior que zero`);
    }
    return round2(value);
  }

  private calculateTotals(baseAmount: number, tollAmount: number) {
    const inss = round2(
      baseAmount * DRIVER_PAYMENT_RATES.BASE_PERCENT * DRIVER_PAYMENT_RATES.INSS_RATE,
    );
    const sestSenat = round2(
      baseAmount * DRIVER_PAYMENT_RATES.BASE_PERCENT * DRIVER_PAYMENT_RATES.SEST_SENAT_RATE,
    );
    const total = round2(baseAmount - inss - sestSenat - tollAmount);
    return { inss, sestSenat, total };
  }

  private resolvePix(
    pixKey: string | undefined,
    pixKeyType: PixKeyType | undefined,
    context: DriverPaymentContext,
  ): { pixKey: string; pixKeyType: PixKeyType } {
    const finalKey = (pixKey ?? context.pixKey).trim();
    const finalType = pixKeyType ?? detectPixKeyType(finalKey) ?? context.pixKeyType;
    return { pixKey: finalKey, pixKeyType: finalType };
  }

  private toResponse(payment: DriverPaymentEntity): DriverPaymentResponse {
    return {
      id: payment.id,
      driverId: payment.driverId,
      driverName: payment.driverName,
      vehiclePlate: payment.vehiclePlate,
      rntrc: payment.rntrc,
      pixKeyType: payment.pixKeyType,
      pixKey: payment.pixKey,
      baseAmount: payment.baseAmount,
      inssAmount: payment.inssAmount,
      sestSenatAmount: payment.sestSenatAmount,
      tollAmount: payment.tollAmount,
      totalAmount: payment.totalAmount,
      tollStatus: payment.tollStatus,
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      loadingDate: payment.loadingDate.toISOString().slice(0, 10),
      deliveryDate: payment.deliveryDate.toISOString().slice(0, 10),
      clientName: payment.clientName,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private async logAction(
    driverPaymentId: string,
    action: DriverPaymentAuditAction,
    actorUserId: string,
    snapshot: unknown,
  ): Promise<void> {
    try {
      await this.auditLogRepository.log(
        new DriverPaymentAuditLogEntity(
          randomUUID(),
          driverPaymentId,
          action,
          actorUserId,
          JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
          new Date(),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Falha ao registrar log de auditoria (${action}) para pagamento ${driverPaymentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

