import { setupWorker } from 'msw/browser';

import { authHandlers } from './handlers/auth.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';

export const worker = setupWorker(...authHandlers, ...dashboardHandlers);
