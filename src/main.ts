import 'dotenv/config';
import { createConfiguredApp } from '@app/bootstrap';

async function bootstrap() {
  const app = await createConfiguredApp();
  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
