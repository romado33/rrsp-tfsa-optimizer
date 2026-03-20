/**
 * Worker thread for running Monte Carlo simulations off the main event loop.
 *
 * Receives the full profile + scenario list from the parent thread,
 * runs generateScenarioData(), and posts the result back.
 */

import { parentPort, workerData } from 'worker_threads';
import { generateScenarioData } from './financialEngine.js';

const result = generateScenarioData(workerData.profile);
parentPort.postMessage(result);
