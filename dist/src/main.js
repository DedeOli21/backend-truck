"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bootstrap_1 = require("./bootstrap");
async function bootstrap() {
    const app = await (0, bootstrap_1.createConfiguredApp)();
    await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
//# sourceMappingURL=main.js.map