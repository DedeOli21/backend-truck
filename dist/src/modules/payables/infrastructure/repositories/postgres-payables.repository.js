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
exports.PostgresPayablesRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../../../database/typeorm/entities");
const user_wallet_provisioning_service_1 = require("../../../../database/typeorm/repositories/user-wallet-provisioning.service");
const payable_entity_1 = require("../../domain/entities/payable.entity");
let PostgresPayablesRepository = class PostgresPayablesRepository {
    constructor(payablesRepository, walletsRepository, dataSource, provisioningService) {
        this.payablesRepository = payablesRepository;
        this.walletsRepository = walletsRepository;
        this.dataSource = dataSource;
        this.provisioningService = provisioningService;
    }
    async findByUser(userId) {
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
    async saveMany(userId, items) {
        const wallet = await this.provisioningService.ensureWalletForUser(userId);
        const rows = items.map((item) => this.payablesRepository.create({
            id: item.id,
            walletId: wallet.id,
            title: item.description,
            category: item.category,
            amount: item.amount.toFixed(2),
            dueDate: item.dueDate.toISOString().slice(0, 10),
            status: item.paid ? entities_1.PayableStatus.PAID : entities_1.PayableStatus.PENDING,
            paidAt: item.paidAt,
            transactionId: item.transactionId,
        }));
        await this.payablesRepository.save(rows);
    }
    async update(userId, item) {
        const wallet = await this.walletsRepository.findOne({ where: { userId } });
        if (!wallet) {
            return item;
        }
        await this.payablesRepository.update({ id: item.id, walletId: wallet.id }, {
            status: item.paid ? entities_1.PayableStatus.PAID : entities_1.PayableStatus.PENDING,
            paidAt: item.paidAt,
            transactionId: item.transactionId,
        });
        return item;
    }
    async pay(userId, payableId) {
        const wallet = await this.provisioningService.ensureWalletForUser(userId);
        return this.dataSource.transaction(async (manager) => {
            const payablesRepo = manager.getRepository(entities_1.PayableOrmEntity);
            const walletsRepo = manager.getRepository(entities_1.WalletOrmEntity);
            const transactionsRepo = manager.getRepository(entities_1.TransactionOrmEntity);
            const payable = await payablesRepo.findOne({
                where: { id: payableId, walletId: wallet.id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!payable) {
                throw new common_1.NotFoundException('Boleto nao encontrado');
            }
            if (payable.status === entities_1.PayableStatus.PAID) {
                return this.toDomain(userId, payable);
            }
            const lockedWallet = await walletsRepo
                .createQueryBuilder('wallet')
                .setLock('pessimistic_write')
                .where('wallet.id = :id', { id: wallet.id })
                .getOne();
            if (!lockedWallet) {
                throw new common_1.NotFoundException('Carteira nao encontrada');
            }
            const currentBalance = Number(lockedWallet.balance);
            const payableAmount = Number(payable.amount);
            if (payableAmount > currentBalance) {
                throw new common_1.BadRequestException('Saldo insuficiente para pagar boleto');
            }
            const categoryMap = {
                INSURANCE: entities_1.TransactionCategory.INSURANCE,
                MAINTENANCE: entities_1.TransactionCategory.MAINTENANCE,
                FINANCING: entities_1.TransactionCategory.FINANCING,
            };
            const transaction = transactionsRepo.create({
                id: (0, crypto_1.randomUUID)(),
                walletId: lockedWallet.id,
                truckId: null,
                direction: entities_1.TransactionDirection.OUT,
                category: categoryMap[payable.category],
                amount: payable.amount,
                description: `Pagamento: ${payable.title}`,
                transactionDate: new Date(),
            });
            const savedTransaction = await transactionsRepo.save(transaction);
            const nextBalance = currentBalance - payableAmount;
            await walletsRepo.update({ id: lockedWallet.id }, { balance: nextBalance.toFixed(2) });
            payable.status = entities_1.PayableStatus.PAID;
            payable.paidAt = new Date();
            payable.transactionId = savedTransaction.id;
            const savedPayable = await payablesRepo.save(payable);
            return this.toDomain(userId, savedPayable);
        });
    }
    toDomain(userId, row) {
        const dueDate = new Date(row.dueDate);
        const urgentLimit = new Date();
        urgentLimit.setDate(urgentLimit.getDate() + 7);
        return new payable_entity_1.PayableEntity(row.id, userId, row.category, row.title, Number(row.amount), dueDate, row.status === entities_1.PayableStatus.PENDING && dueDate <= urgentLimit, row.status === entities_1.PayableStatus.PAID, row.paidAt, row.transactionId);
    }
};
exports.PostgresPayablesRepository = PostgresPayablesRepository;
exports.PostgresPayablesRepository = PostgresPayablesRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.PayableOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.WalletOrmEntity)),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __param(3, (0, common_1.Inject)(user_wallet_provisioning_service_1.UserWalletProvisioningService)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        user_wallet_provisioning_service_1.UserWalletProvisioningService])
], PostgresPayablesRepository);
//# sourceMappingURL=postgres-payables.repository.js.map