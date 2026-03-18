import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import {
  TRANSACTIONS_REPOSITORY,
  TransactionsRepository,
} from '@transactions/domain/repositories/transactions.repository';
import { CreateFreightDto } from '@transactions/presentation/dtos/create-freight.dto';
import { CreateFuelDto } from '@transactions/presentation/dtos/create-fuel.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TRANSACTIONS_REPOSITORY)
    private readonly repository: TransactionsRepository,
  ) {}

  async createFreight(
    userId: string,
    payload: CreateFreightDto,
  ): Promise<TransactionEntity> {
    const transaction = new TransactionEntity(
      randomUUID(),
      userId,
      'FREIGHT',
      payload.amount,
      payload.description,
      new Date(),
    );

    return this.repository.create(transaction);
  }

  async createFuel(userId: string, payload: CreateFuelDto): Promise<TransactionEntity> {
    const currentBalance = await this.getBalance(userId);
    if (payload.amount > currentBalance) {
      throw new BadRequestException('Saldo insuficiente para abastecimento');
    }

    const transaction = new TransactionEntity(
      randomUUID(),
      userId,
      'FUEL',
      payload.amount,
      payload.description,
      new Date(),
    );

    return this.repository.create(transaction);
  }

  async listByUser(userId: string): Promise<TransactionEntity[]> {
    return this.repository.findByUser(userId);
  }

  async getBalance(userId: string): Promise<number> {
    const transactions = await this.repository.findByUser(userId);
    return transactions.reduce((acc, transaction) => {
      return transaction.type === 'FREIGHT'
        ? acc + transaction.amount
        : acc - transaction.amount;
    }, 0);
  }
}





