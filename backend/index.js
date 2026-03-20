/**
 * index.js — WS Financial Decision Engine: Express API Server
 *
 * ─── ARCHITECTURE ────────────────────────────────────────────────────────────
 *
 * This server sits between the React frontend and two services:
 *   1. The financial engine (financialEngine.js) — pure math, runs instantly
 *   2. OpenAI GPT (via OpenAI SDK) — narrates results in plain English
 *
 * Request flow for POST /api/analyze:
 *   1. Validate the incoming financial profile
 *   2. Run generateScenarioData() — Monte Carlo + tax calculations (~50–200ms)
 *   3. Fire TWO parallel OpenAI requests:
 *        a) Scenario narrations (pros/cons for each scenario)
 *        b) Decision gate (recommendation + human/AI boundary + risks)
 *   4. Merge AI output into the scenario data
 *   5. Return combined result to the frontend
 *
 * Why two parallel AI calls?
 *   Separating narration from the decision gate keeps each prompt focused.
 *   The narration prompt is scenario-specific; the decision gate prompt is
 *   cross-scenario reasoning. Running in parallel reduces total latency.
 *
 * ─── ENDPOINTS ───────────────────────────────────────────────────────────────
 *
 *   POST /api/analyze  — Main endpoint. Full analysis + AI narration.
 *   GET  /health       — Health check, returns model + status.
 *
 * ─── ENVIRONMENT ─────────────────────────────────────────────────────────────
 *
 *   OPENAI_API_KEY  — Required. Your OpenAI API key.
 *   OPENAI_MODEL    — Optional. Defaults to gpt-4o.
 *   PORT            — Optional. Defaults to 4000.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Worker } from 'worker_threads';

import { NarrationResponseSchema, DecisionGateSchema } from './lib/schemas.js';

// ─── SETUP ────────────────────────────────────────────────────────────────────

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
  console.error('\n❌ OPENAI_API_KEY is not set or is still the placeholder value.');
  console.error('   Copy .env.example to .env and add your real API key.\n');
  process.exit(1);
}

const app   = express();
const PORT  = process.env.PORT || 4000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// __dirname is not available in ES modules — reconstruct it from import.meta.url
const __dirname = dirname(fileURLToPath(import.meta.url));

// OpenAI client. Reads OPENAI_API_KEY from environment automatically.
const openai = new OpenAI();

// ─── LOAD PROMPT TEMPLATES ────────────────────────────────────────────────────
// Prompts live in /prompts/*.md so they can be edited without touching server code.

const NARRATION_SYSTEM_PROMPT = readFileSync(
  join(__dirname, 'prompts', 'scenarioNarrationPrompt.md'),
  'utf-8'
);

const DECISION_GATE_SYSTEM_PROMPT = readFileSync(
  join(__dirname, 'prompts', 'decisionGatePrompt.md'),
  'utf-8'
);

const WORKER_PATH = join(__dirname, 'lib', 'financialEngine.worker.js');

/**
 * Runs the financial engine in a worker thread so Monte Carlo simulations
 * don't block the Node.js event loop during concurrent requests.
 */
function runEngineInWorker(profile) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: { profile } });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

// CORS: only allow the Vite dev server and common local origins.
// In production, replace with your actual deployed frontend URL.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
}));

// Rate limit: max 10 analysis requests per minute per IP
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests — please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '1mb' }));

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/**
 * Parses a JSON response from the LLM.
 *
 * The model is instructed to return raw JSON only (no markdown fences).
 * This function handles cases where the model adds fences anyway, or
 * includes a preamble before the JSON object.
 *
 * Parsing strategy (three passes):
 *   1. Direct parse — works if the model followed instructions
 *   2. Strip ```json ... ``` fences — common failure mode
 *   3. Find the first { or [ — handles preamble text before the JSON
 *
 * @param {string} text - Raw text from the LLM response
 * @returns {object} Parsed JSON object
 * @throws {SyntaxError} If all three strategies fail
 */
function parseLLMJson(text) {
  if (!text) throw new SyntaxError('Empty response from LLM');

  // Pass 1: direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Pass 2: strip markdown code fences
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  // Pass 3: find the first JSON object/array
  const jsonStart = stripped.search(/[{[]/);
  if (jsonStart !== -1) {
    try {
      return JSON.parse(stripped.slice(jsonStart));
    } catch {}
  }

  throw new SyntaxError(`Could not parse LLM response as JSON. Raw text: ${text.slice(0, 200)}`);
}

/**
 * Calls OpenAI with a system prompt and user message.
 * Returns the parsed JSON object from the model's response.
 *
 * @param {string} systemPrompt - Instructions for the model (from prompts/*.md)
 * @param {string} userMessage  - The data payload (stringified JSON)
 * @returns {Promise<object>}   Parsed response
 */
async function callLLM(systemPrompt, userMessage) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content;
  return parseLLMJson(text);
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Validates the financial profile sent from the frontend.
 *
 * Returns an array of error strings. An empty array means the profile is valid.
 * We validate ranges and types — not business logic (that's the engine's job).
 *
 * @param {object} profile - Raw profile from request body
 * @returns {string[]} Array of validation errors
 */
function validateProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return ['Missing profile object'];
  }

  const required = [
    'age', 'province', 'annualIncome', 'monthlySavings',
    'riskTolerance', 'primaryGoal', 'timeHorizon',
  ];
  for (const field of required) {
    if (profile[field] === undefined || profile[field] === null || profile[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) return errors;

  if (profile.age < 18 || profile.age > 80)             errors.push('Age must be between 18 and 80');
  if (profile.annualIncome < 0)                         errors.push('Annual income cannot be negative');
  if (profile.annualIncome > 10_000_000)                errors.push('Annual income seems unrealistically high');
  if (profile.monthlySavings < 0)                       errors.push('Monthly savings cannot be negative');
  if (profile.timeHorizon < 1 || profile.timeHorizon > 50) errors.push('Time horizon must be 1–50 years');

  const validProvinces = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'NT', 'NU', 'YT'];
  if (!validProvinces.includes(profile.province))       errors.push(`Province must be one of: ${validProvinces.join(', ')}`);

  const validRisk = ['conservative', 'balanced', 'growth', 'aggressive'];
  if (!validRisk.includes(profile.riskTolerance))       errors.push(`riskTolerance must be one of: ${validRisk.join(', ')}`);

  const validGoals = ['retire', 'buy_home', 'fire', 'wealth'];
  if (!validGoals.includes(profile.primaryGoal))        errors.push(`primaryGoal must be one of: ${validGoals.join(', ')}`);

  return errors;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 *
 * Main analysis endpoint. Accepts a financial profile, returns 4 scenarios
 * with Monte Carlo projections, AI narration, and a human/AI decision gate.
 *
 * Request body:
 * {
 *   profile: {
 *     age:                  number,   // 18–80
 *     province:             string,   // ON | BC | AB | QC | MB
 *     annualIncome:         number,   // gross income in CAD
 *     rrspBalance:          number,   // current RRSP balance
 *     rrspRoom:             number,   // unused RRSP contribution room (from NOA)
 *     tfsaBalance:          number,   // current TFSA balance
 *     tfsaRoom:             number,   // unused TFSA room (from CRA My Account)
 *     fhsaBalance:          number,   // current FHSA balance (0 if not applicable)
 *     nonRegisteredBalance: number,   // non-registered investments
 *     monthlySavings:       number,   // how much you can save per month
 *     riskTolerance:        string,   // conservative | balanced | growth | aggressive
 *     primaryGoal:          string,   // retire | buy_home | fire | wealth
 *     timeHorizon:          number,   // years until goal
 *     isFirstTimeBuyer:     boolean,  // FHSA eligibility
 *   }
 * }
 *
 * Response: { scenarios, taxSummary, contributionRooms, decisionGate }
 */
app.post('/api/analyze', analysisLimiter, async (req, res) => {
  const { profile } = req.body;

  // ── Validate ─────────────────────────────────────────────────────────────
  const errors = validateProfile(profile);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid profile', details: errors });
  }

  try {
    // ── Step 1: Financial engine (runs in a worker thread) ──────────────────
    // Offloaded to a worker so Monte Carlo doesn't block the event loop.
    console.log(`[analyze] Running financial engine for profile: age=${profile.age}, income=${profile.annualIncome}, goal=${profile.primaryGoal}`);
    const engineData = await runEngineInWorker(profile);
    console.log(`[analyze] Financial engine complete. Scenarios: ${engineData.scenarios.map(s => s.id).join(', ')}`);

    // ── Step 2: Build Claude prompts ────────────────────────────────────────
    // We pass the full engine output to Claude so it can reference real numbers.
    const sharedContext = JSON.stringify({
      profile: {
        age:            profile.age,
        province:       profile.province,
        annualIncome:   profile.annualIncome,
        monthlySavings: profile.monthlySavings,
        riskTolerance:  profile.riskTolerance,
        primaryGoal:    profile.primaryGoal,
        timeHorizon:    profile.timeHorizon,
        isFirstTimeBuyer: profile.isFirstTimeBuyer,
      },
      taxSummary:        engineData.taxSummary,
      contributionRooms: engineData.contributionRooms,
      scenarios:         engineData.scenarios.map(s => ({
        id:              s.id,
        name:            s.name,
        annual:          s.annual,
        monthly:         s.monthly,
        projections:     s.projections,
        rrspTaxSaving:   s.rrspTaxSaving,
        allocationLabel: s.allocationLabel,
      })),
    }, null, 2);

    // ── Step 3: Two parallel OpenAI calls ──────────────────────────────────
    console.log('[analyze] Calling OpenAI for narrations and decision gate (parallel)...');

    const [narrationRaw, decisionGateRaw] = await Promise.all([
      callLLM(NARRATION_SYSTEM_PROMPT,    sharedContext),
      callLLM(DECISION_GATE_SYSTEM_PROMPT, sharedContext),
    ]);

    console.log('[analyze] OpenAI calls complete. Validating response shapes...');

    const narrationResult   = NarrationResponseSchema.parse(narrationRaw);
    const decisionGateResult = DecisionGateSchema.parse(decisionGateRaw);

    // ── Step 4: Merge Claude output into scenarios ──────────────────────────
    // Claude returns narrations keyed by scenario ID — attach each to its scenario.
    const narrations = narrationResult.narrations;

    const enrichedScenarios = engineData.scenarios.map(scenario => ({
      ...scenario,
      narration: narrations[scenario.id]?.narration ?? '',
      pros:      narrations[scenario.id]?.pros      ?? [],
      cons:      narrations[scenario.id]?.cons      ?? [],
    }));

    // ── Step 5: Return combined result ──────────────────────────────────────
    return res.json({
      scenarios:         enrichedScenarios,
      taxSummary:        engineData.taxSummary,
      contributionRooms: engineData.contributionRooms,
      decisionGate:      decisionGateResult,
    });

  } catch (err) {
    console.error('[analyze] Error:', err);

    // Distinguish between OpenAI errors and engine errors for easier debugging
    const isLLMError = err?.message?.includes('openai') || err?.status !== undefined;
    return res.status(500).json({
      error:   isLLMError ? 'AI narration failed' : 'Analysis failed',
      details: String(err?.message ?? err),
    });
  }
});

/**
 * GET /health
 *
 * Simple health check. Confirms the server is running and shows which model
 * is configured. Useful for verifying the .env is set up correctly.
 */
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    model:     MODEL,
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/analyze',
      'GET  /health',
    ],
  });
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 WS Financial Decision Engine backend running on http://localhost:${PORT}`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
