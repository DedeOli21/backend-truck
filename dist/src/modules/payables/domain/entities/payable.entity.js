"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayableEntity = void 0;
class PayableEntity {
    constructor(id, userId, category, description, amount, dueDate, urgent, paid, paidAt, transactionId = null) {
        this.id = id;
        this.userId = userId;
        this.category = category;
        this.description = description;
        this.amount = amount;
        this.dueDate = dueDate;
        this.urgent = urgent;
        this.paid = paid;
        this.paidAt = paidAt;
        this.transactionId = transactionId;
    }
}
exports.PayableEntity = PayableEntity;
//# sourceMappingURL=payable.entity.js.map