"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionEntity = void 0;
class TransactionEntity {
    constructor(id, userId, type, amount, description, createdAt) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.amount = amount;
        this.description = description;
        this.createdAt = createdAt;
    }
}
exports.TransactionEntity = TransactionEntity;
//# sourceMappingURL=transaction.entity.js.map