import * as debug from 'debug';
import * as dotenv from 'dotenv';
import * as express from 'express';
import 'reflect-metadata';
import { AlgoliaCredentialsValidator } from './common/config-validation/algolia-credentials-validator';
import { DcCredentialsValidator } from './common/config-validation/dc-credentials-validator';
import { EnvConfigValidator } from './common/config-validation/env-config-validator';
import { DefaultErrorHandler } from './middleware/default-error-handler';
import ValidateWebhookRequest from './middleware/validate-webhook-request';
import { snapshotPublishedWebhookRouteHandler } from './webhooks/snapshot-published-webhook-route-handler';

dotenv.config();

EnvConfigValidator.validateEnvironment(process.env);

const PORT: number = Number(process.env.PORT) || 3000;
const DC_CLIENT_ID: string = process.env.DC_CLIENT_ID;
const DC_CLIENT_SECRET: string = process.env.DC_CLIENT_SECRET;
const DC_AUTH_URL: string = process.env.DC_AUTH_URL;
const DC_API_URL: string = process.env.DC_API_URL;

const log = debug('dc-integrations-algolia:app');

(async (): Promise<void> => {
  log('Validating credentials');
  await DcCredentialsValidator.validateCredentials(
    { clientId: DC_CLIENT_ID, clientSecret: DC_CLIENT_SECRET },
    { authUrl: DC_AUTH_URL, apiUrl: DC_API_URL }
  );

  await AlgoliaCredentialsValidator.validateCredentials({
    apiKey: process.env.ALGOLIA_API_KEY,
    applicationId: process.env.ALGOLIA_APPLICATION_ID,
    algoliaIndex: process.env.ALGOLIA_INDEX_NAME
  });

  log('Credentials validated');

  const app = express();
  const router = express.Router();

  router.post(
    '/webhook',
    ValidateWebhookRequest.middleware(process.env.WEBHOOK_SECRET),
    snapshotPublishedWebhookRouteHandler
  );

  app.use('/', router);
  app.use(DefaultErrorHandler.handleError);
  app.listen(PORT, (): void => log(`Listening on port ${PORT}!`));
})().catch(
  (err): void => {
    log('Unexpected error whilst setting up app', err);
  }
);
