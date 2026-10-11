// bisiyata dishmaya, leharbot ahava biyisral
import { registerActionClickHandler } from './appTab';
import { registerJobsHost } from './jobs/workerHost';

// Listeners must be registered synchronously at the top level.
registerActionClickHandler();
registerJobsHost();
