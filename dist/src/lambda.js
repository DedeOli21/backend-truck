"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
require("dotenv/config");
const serverless_express_1 = __importDefault(require("@codegenie/serverless-express"));
const platform_express_1 = require("@nestjs/platform-express");
const bootstrap_1 = require("./bootstrap");
const express_1 = __importDefault(require("express"));
let cachedHandler = null;
async function getHandler() {
    if (cachedHandler) {
        return cachedHandler;
    }
    const expressApp = (0, express_1.default)();
    const app = await (0, bootstrap_1.createConfiguredApp)(new platform_express_1.ExpressAdapter(expressApp));
    await app.init();
    cachedHandler = (0, serverless_express_1.default)({ app: expressApp });
    return cachedHandler;
}
const handler = async (event, context, callback) => {
    const lambdaHandler = await getHandler();
    return lambdaHandler(event, context, callback);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map