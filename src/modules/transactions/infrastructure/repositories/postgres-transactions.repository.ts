import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import {
  TransactionCategory,
  TransactionDirection,
  TransactionOrmEntity,
  WalletOrmEntity,
} from '@database/typeorm/entities';
import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions.repository';

@Injectable()
export class PostgresTransactionsRepository implements TransactionsRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionsRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletsRepository: Repository<WalletOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly provisioningService: UserWalletProvisioningService,
  ) {}

  async create(transaction: TransactionEntity): Promise<TransactionEntity> {
    const wallet = await this.provisioningService.ensureWalletForUser(transaction.userId);
    const direction =
      transaction.type === 'FREIGHT'
        ? TransactionDirection.IN
        : TransactionDirection.OUT;
    const category =
      transaction.type === 'FREIGHT'
        ? TransactionCategory.FREIGHT
        : TransactionCategory.FUEL;

    await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TransactionOrmEntity);
      const walletRepo = manager.getRepository(WalletOrmEntity);

      const lockedWallet = await walletRepo
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.id = :id', { id: wallet.id })
        .getOne();

      if (!lockedWallet) {
        throw new BadRequestException('Carteira nao encontrada');
      }

      const currentBalance = Number(lockedWallet.balance);
      const nextBalance =
        direction === TransactionDirection.IN
          ? currentBalance + transaction.amount
          : currentBalance - transaction.amount;

      if (nextBalance < 0) {
        throw new BadRequestException('Saldo insuficiente para operacao');
      }

      const persisted = txRepo.create({
        id: transaction.id,
        walletId: lockedWallet.id,
        truckId: null,
        direction,
        category,
        amount: transaction.amount.toFixed(2),
        description: transaction.description,
        transactionDate: transaction.createdAt,
      });

      await txRepo.save(persisted);

      await walletRepo.update(
        { id: lockedWallet.id },
        {
          balance: nextBalance.toFixed(2),
        },
      );
    });

    return transaction;
  }

  async findByUser(userId: string): Promise<TransactionEntity[]> {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      return [];
    }

    const rows = await this.transactionsRepository.find({
      where: { walletId: wallet.id },
      order: { transactionDate: 'ASC' },
    });

    return rows.map((row) =>
      new TransactionEntity(
        row.id,
        userId,
        row.category === TransactionCategory.FREIGHT ? 'FREIGHT' : 'FUEL',
        Number(row.amount),
        row.description,
        row.transactionDate,
      ),
    );
  }
}





