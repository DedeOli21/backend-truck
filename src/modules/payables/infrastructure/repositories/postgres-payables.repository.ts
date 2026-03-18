import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import {
  PayableCategoryDb,
  PayableOrmEntity,
  PayableStatus,
  TransactionCategory,
  TransactionDirection,
  TransactionOrmEntity,
  WalletOrmEntity,
} from '@database/typeorm/entities';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { PayablesRepository } from '@payables/domain/repositories/payables.repository';

@Injectable()
export class PostgresPayablesRepository implements PayablesRepository {
  constructor(
    @InjectRepository(PayableOrmEntity)
    private readonly payablesRepository: Repository<PayableOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletsRepository: Repository<WalletOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly provisioningService: UserWalletProvisioningService,
  ) {}

  async findByUser(userId: string): Promise<PayableEntity[]> {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      return [];
    }

    const rows = await this.payablesRepository.find({
      where: { walletId: wallet.id },
      order: { dueDate: 'ASC' },
    });

    return rows.map((row) => this.toDomain(userId, row));
  }

  async saveMany(userId: string, items: PayableEntity[]): Promise<void> {
    const wallet = await this.provisioningService.ensureWalletForUser(userId);

    const rows = items.map((item) =>
      this.payablesRepository.create({
        id: item.id,
        walletId: wallet.id,
        title: item.description,
        category: item.category as PayableCategoryDb,
        amount: item.amount.toFixed(2),
        dueDate: item.dueDate.toISOString().slice(0, 10),
        status: item.paid ? PayableStatus.PAID : PayableStatus.PENDING,
        paidAt: item.paidAt,
        transactionId: item.transactionId,
      }),
    );

    await this.payablesRepository.save(rows);
  }

  async update(userId: string, item: PayableEntity): Promise<PayableEntity> {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      return item;
    }

    await this.payablesRepository.update(
      { id: item.id, walletId: wallet.id },
      {
        status: item.paid ? PayableStatus.PAID : PayableStatus.PENDING,
        paidAt: item.paidAt,
        transactionId: item.transactionId,
      },
    );

    return item;
  }

  async pay(userId: string, payableId: string): Promise<PayableEntity> {
    const wallet = await this.provisioningService.ensureWalletForUser(userId);

    return this.dataSource.transaction(async (manager) => {
      const payablesRepo = manager.getRepository(PayableOrmEntity);
      const walletsRepo = manager.getRepository(WalletOrmEntity);
      const transactionsRepo = manager.getRepository(TransactionOrmEntity);

      const payable = await payablesRepo.findOne({
        where: { id: payableId, walletId: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payable) {
        throw new NotFoundException('Boleto nao encontrado');
      }

      if (payable.status === PayableStatus.PAID) {
        return this.toDomain(userId, payable);
      }

      const lockedWallet = await walletsRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.id = :id', { id: wallet.id })
        .getOne();

      if (!lockedWallet) {
        throw new NotFoundException('Carteira nao encontrada');
      }

      const currentBalance = Number(lockedWallet.balance);
      const payableAmount = Number(payable.amount);
      if (payableAmount > currentBalance) {
        throw new BadRequestException('Saldo insuficiente para pagar boleto');
      }

      const categoryMap: Record<PayableCategoryDb, TransactionCategory> = {
        INSURANCE: TransactionCategory.INSURANCE,
        MAINTENANCE: TransactionCategory.MAINTENANCE,
        FINANCING: TransactionCategory.FINANCING,
      };

      const transaction = transactionsRepo.create({
        id: randomUUID(),
        walletId: lockedWallet.id,
        truckId: null,
        direction: TransactionDirection.OUT,
        category: categoryMap[payable.category],
        amount: payable.amount,
        description: `Pagamento: ${payable.title}`,
        transactionDate: new Date(),
      });

      const savedTransaction = await transactionsRepo.save(transaction);

      const nextBalance = currentBalance - payableAmount;
      await walletsRepo.update(
        { id: lockedWallet.id },
        { balance: nextBalance.toFixed(2) },
      );

      payable.status = PayableStatus.PAID;
      payable.paidAt = new Date();
      payable.transactionId = savedTransaction.id;
      const savedPayable = await payablesRepo.save(payable);

      return this.toDomain(userId, savedPayable);
    });
  }

  private toDomain(userId: string, row: PayableOrmEntity): PayableEntity {
    const dueDate = new Date(row.dueDate);
    const urgentLimit = new Date();
    urgentLimit.setDate(urgentLimit.getDate() + 7);

    return new PayableEntity(
      row.id,
      userId,
      row.category as PayableEntity['category'],
      row.title,
      Number(row.amount),
      dueDate,
      row.status === PayableStatus.PENDING && dueDate <= urgentLimit,
      row.status === PayableStatus.PAID,
      row.paidAt,
      row.transactionId,
    );
  }
}





