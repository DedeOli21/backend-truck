"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresTransactionsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_wallet_provisioning_service_1 = require("../../../../database/typeorm/repositories/user-wallet-provisioning.service");
const entities_1 = require("../../../../database/typeorm/entities");
const transaction_entity_1 = require("../../domain/entities/transaction.entity");
let PostgresTransactionsRepository = class PostgresTransactionsRepository {
    constructor(transactionsRepository, walletsRepository, dataSource, provisioningService) {
        this.transactionsRepository = transactionsRepository;
        this.walletsRepository = walletsRepository;
        this.dataSource = dataSource;
        this.provisioningService = provisioningService;
    }
    async create(transaction) {
        const wallet = await this.provisioningService.ensureWalletForUser(transaction.userId);
        const direction = transaction.type === 'FREIGHT'
            ? entities_1.TransactionDirection.IN
            : entities_1.TransactionDirection.OUT;
        const category = transaction.type === 'FREIGHT'
            ? entities_1.TransactionCategory.FREIGHT
            : entities_1.TransactionCategory.FUEL;
        await this.dataSource.transaction(async (manager) => {
            const txRepo = manager.getRepository(entities_1.TransactionOrmEntity);
            const walletRepo = manager.getRepository(entities_1.WalletOrmEntity);
            const lockedWallet = await walletRepo
                .createQueryBuilder('wallet')
                .setLock('pessimistic_write')
                .where('wallet.id = :id', { id: wallet.id })
                .getOne();
            if (!lockedWallet) {
                throw new common_1.BadRequestException('Carteira nao encontrada');
            }
            const currentBalance = Number(lockedWallet.balance);
            const nextBalance = direction === entities_1.TransactionDirection.IN
                ? currentBalance + transaction.amount
                : currentBalance - transaction.amount;
            if (nextBalance < 0) {
                throw new common_1.BadRequestException('Saldo insuficiente para operacao');
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
            await walletRepo.update({ id: lockedWallet.id }, {
                balance: nextBalance.toFixed(2),
            });
        });
        return transaction;
    }
    async findByUser(userId) {
        const wallet = await this.walletsRepository.findOne({ where: { userId } });
        if (!wallet) {
            return [];
        }
        const rows = await this.transactionsRepository.find({
            where: { walletId: wallet.id },
            order: { transactionDate: 'ASC' },
        });
        return rows.map((row) => new transaction_entity_1.TransactionEntity(row.id, userId, row.category === entities_1.TransactionCategory.FREIGHT ? 'FREIGHT' : 'FUEL', Number(row.amount), row.description, row.transactionDate));
    }
};
exports.PostgresTransactionsRepository = PostgresTransactionsRepository;
exports.PostgresTransactionsRepository = PostgresTransactionsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.TransactionOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.WalletOrmEntity)),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __param(3, (0, common_1.Inject)(user_wallet_provisioning_service_1.UserWalletProvisioningService)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        user_wallet_provisioning_service_1.UserWalletProvisioningService])
], PostgresTransactionsRepository);
//# sourceMappingURL=postgres-transactions.repository.js.map