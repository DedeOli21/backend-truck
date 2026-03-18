"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayableStatus = exports.PayableCategoryDb = exports.TransactionCategory = exports.TransactionDirection = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["DRIVER"] = "DRIVER";
})(UserRole || (exports.UserRole = UserRole = {}));
var TransactionDirection;
(function (TransactionDirection) {
    TransactionDirection["IN"] = "IN";
    TransactionDirection["OUT"] = "OUT";
})(TransactionDirection || (exports.TransactionDirection = TransactionDirection = {}));
var TransactionCategory;
(function (TransactionCategory) {
    TransactionCategory["FREIGHT"] = "FREIGHT";
    TransactionCategory["FUEL"] = "FUEL";
    TransactionCategory["MAINTENANCE"] = "MAINTENANCE";
    TransactionCategory["INSURANCE"] = "INSURANCE";
    TransactionCategory["FINANCING"] = "FINANCING";
})(TransactionCategory || (exports.TransactionCategory = TransactionCategory = {}));
var PayableCategoryDb;
(function (PayableCategoryDb) {
    PayableCategoryDb["INSURANCE"] = "INSURANCE";
    PayableCategoryDb["MAINTENANCE"] = "MAINTENANCE";
    PayableCategoryDb["FINANCING"] = "FINANCING";
})(PayableCategoryDb || (exports.PayableCategoryDb = PayableCategoryDb = {}));
var PayableStatus;
(function (PayableStatus) {
    PayableStatus["PENDING"] = "PENDING";
    PayableStatus["PAID"] = "PAID";
})(PayableStatus || (exports.PayableStatus = PayableStatus = {}));
//# sourceMappingURL=enums.js.map