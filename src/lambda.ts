import { Handler, Context, Callback } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createConfiguredApp } from '@app/bootstrap';
import express from 'express';

let cachedHandler: Handler | null = null;

async function getHandler(): Promise<Handler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  const expressApp = express();
  const app = await createConfiguredApp(new ExpressAdapter(expressApp));
  await app.init();

  cachedHandler = serverlessExpress({ app: expressApp });
  return cachedHandler;
}

export const handler = async (event: unknown, context: Context, callback: Callback) => {
  const lambdaHandler = await getHandler();
  return lambdaHandler(event, context, callback);
};
