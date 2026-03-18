import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { UserRole } from '@database/typeorm/entities/enums';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';

@Injectable()
export class UserWalletProvisioningService {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly usersRepository: Repository<UserOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletsRepository: Repository<WalletOrmEntity>,
  ) {}

  async ensureWalletForUser(userId: string): Promise<WalletOrmEntity> {
    let user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      user = this.usersRepository.create({
        id: userId,
        name: `Driver ${userId.slice(0, 8)}`,
        email: `${userId}@local.driver`,
        passwordHash: 'temporary-hash',
        role: UserRole.DRIVER,
      });
      await this.usersRepository.save(user);
    }

    let wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletsRepository.create({
        id: randomUUID(),
        userId,
        balance: '0',
        lastSync: null,
      });
      await this.walletsRepository.save(wallet);
    }

    return wallet;
  }
}




