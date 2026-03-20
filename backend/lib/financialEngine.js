/**
 * financialEngine.js
 *
 * Core financial modeling engine for the WS AI Financial Decision Engine.
 * All figures are for the 2025 Canadian tax year.
 *
 * This module does all the math — no AI involved here. The AI is only called
 * after this module produces its results, to explain them in plain English.
 *
 * ─── WHAT THIS MODULE DOES ───────────────────────────────────────────────────
 *
 * 1. CONTRIBUTION ROOM
 *    Figures out how much you can put into each account type this year:
 *    - RRSP: 18% of last year's income, up to $32,490 (2025), plus any
 *      unused room you've carried forward from past years
 *    - TFSA: $7,000/year (2025) plus any unused room you haven't used yet
 *    - FHSA: $8,000/year, $40,000 lifetime max, only if you've never owned a home
 *
 * 2. FOUR INVESTMENT STRATEGIES
 *    Builds 4 different ways to split your savings across accounts:
 *    - Tax Saver (RRSP first): get a tax refund now, pay tax later in retirement
 *    - Tax-Free Growth (TFSA first): never pay tax on your gains, withdraw anytime
 *    - Home Buyer (FHSA first) or 50/50 Split: best option for first-time buyers
 *    - Maximum Flexibility: keep most money accessible, less tax-efficient
 *
 * 3. 1,000 SIMULATIONS PER STRATEGY
 *    Instead of one "average" projection, we simulate 1,000 different futures
 *    for each strategy. This shows you the range of possible outcomes —
 *    from worst case (bottom 10%) to best case (top 10%).
 *
 * ─── INVESTMENT RETURN ASSUMPTIONS ──────────────────────────────────────────
 *
 *   Conservative (40% stocks / 60% bonds): avg 5.5%/year, can swing +/- 8%
 *   Balanced     (60% stocks / 40% bonds): avg 7.0%/year, can swing +/- 12%
 *   Growth       (80% stocks / 20% bonds): avg 8.5%/year, can swing +/- 16%
 *   Aggressive   (100% stocks):            avg 10.0%/year, can swing +/- 20%
 *
 * Based on long-run historical averages. NOT a guarantee of future results.
 *
 * ─── HOW EACH ACCOUNT IS TAXED ──────────────────────────────────────────────
 *
 * RRSP: Your money grows without being taxed along the way. But when you
 *   withdraw it in retirement, it counts as income and you pay tax on it then.
 *   We estimate a 20% tax rate on withdrawals (most retirees pay less).
 *
 * TFSA: Your money grows tax-free and you never pay tax when you take it out.
 *   The balance is worth exactly what it says — no hidden tax bill.
 *
 * FHSA: Works like an RRSP going in (you get a tax break now) but like a TFSA
 *   coming out (no tax when you withdraw to buy your first home).
 *
 * Non-registered: You pay tax on your gains each year, which slows growth.
 *   We estimate about 30% of your annual gains go to tax.
 *
 * ─── IMPORTANT ──────────────────────────────────────────────────────────────
 *
 * This is a simplified model for illustration purposes.
 * It does not account for: inflation, CPP/EI, pension income,
 * OAS clawbacks, estate planning, or future changes to tax law.
 * Always talk to a licensed financial advisor before making big decisions.
 */

import {
  calculateRRSPTaxSaving,
  calculateMarginalRate,
  getTaxSummary,
} from './canadianTax.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RRSP_MAX_2025      = 32490; // CRA annual RRSP deduction limit for 2025
const TFSA_LIMIT_2025    = 7000;  // New TFSA room added in 2025
const FHSA_ANNUAL_LIMIT  = 8000;  // Max new FHSA contributions per year
const FHSA_LIFETIME_MAX  = 40000; // Lifetime FHSA contribution ceiling

const NUM_SIMULATIONS = 1000;
const RETIREMENT_TAX_RATE = 0.20; // Estimated tax rate when you withdraw RRSP money in retirement
const NON_REG_TAX_DRAG    = 0.30; // Roughly 30% of gains lost to tax each year in a regular account

const ALLOCATIONS = {
  conservative: { mean: 0.055, std: 0.08,  label: 'Conservative (40/60)', description: '40% stocks, 60% bonds — steadier but slower growth' },
  balanced:     { mean: 0.070, std: 0.12,  label: 'Balanced (60/40)',     description: '60% stocks, 40% bonds — moderate risk and reward' },
  growth:       { mean: 0.085, std: 0.16,  label: 'Growth (80/20)',       description: '80% stocks, 20% bonds — higher ups and downs, bigger potential' },
  aggressive:   { mean: 0.100, std: 0.20,  label: 'Aggressive (100/0)',   description: '100% stocks — maximum potential, but biggest swings' },
};

// ─── RANDOM NUMBER UTILITIES ──────────────────────────────────────────────────

/**
 * Generates a normally-distributed random number using the Box-Muller transform.
 *
 * Why Box-Muller?
 *   Math.random() produces uniform [0,1] values. Investment returns follow a
 *   bell curve (normal distribution). Box-Muller converts two uniform random
 *   numbers into one normally distributed value via:
 *     Z = sqrt(-2 × ln(U1)) × cos(2π × U2)
 *   where U1, U2 ~ Uniform(0, 1)
 *
 * @param {number} mean - Center of the distribution (e.g., 0.07 for 7% return)
 * @param {number} std  - Width of the distribution (e.g., 0.12 for 12% volatility)
 * @returns {number} A random return for one simulated year
 */
function normalRandom(mean, std) {
  // Clamp u1 away from 0 to avoid Math.log(0) = -Infinity
  const u1 = Math.random() || Number.MIN_VALUE;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/**
 * Returns the value at a given percentile from a pre-sorted array.
 *
 * @param {number[]} sortedArr - Array sorted in ascending order
 * @param {number}   p         - Percentile (0–100)
 * @returns {number}
 */
function percentile(sortedArr, p) {
  const idx = Math.floor((p / 100) * (sortedArr.length - 1));
  return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

// ─── CONTRIBUTION ROOM CALCULATIONS ──────────────────────────────────────────

/**
 * Calculates total available RRSP room this year.
 *
 * New room = 18% of last year's income, up to $32,490 (2025 limit).
 * Total = new room + any unused room carried forward from past years.
 *
 * @param {object} profile - User financial profile
 * @returns {number} Total RRSP room available this year
 */
function calcRRSPRoom(profile) {
  const newRoom = Math.min(profile.annualIncome * 0.18, RRSP_MAX_2025);
  return Math.round(newRoom + (profile.rrspRoom || 0));
}

/**
 * Returns available TFSA room.
 * We add the 2025 annual limit ($7,000) to whatever unused room the user reports.
 *
 * @param {object} profile
 * @returns {number}
 */
function calcTFSARoom(profile) {
  return (profile.tfsaRoom || 0) + TFSA_LIMIT_2025;
}

/**
 * Determines FHSA eligibility and annual room.
 *
 * Eligibility conditions:
 *   - Must be 18 or older
 *   - Must be a first-time home buyer (has not owned a principal residence in the last 4 years)
 *   - FHSA must have been opened (we assume it has if isFirstTimeBuyer is true)
 *
 * Room:
 *   - $8,000/year, up to a lifetime maximum of $40,000
 *   - We subtract any existing FHSA balance from the lifetime limit
 *
 * @param {object} profile
 * @returns {{ eligible: boolean, annualRoom: number, lifetimeRemaining: number }}
 */
function calcFHSAEligibility(profile) {
  if (!profile.isFirstTimeBuyer || profile.age < 18) {
    return { eligible: false, annualRoom: 0, lifetimeRemaining: 0 };
  }
  const usedLifetime = profile.fhsaBalance || 0;
  const lifetimeRemaining = Math.max(0, FHSA_LIFETIME_MAX - usedLifetime);
  const annualRoom = Math.min(FHSA_ANNUAL_LIMIT, lifetimeRemaining);
  return { eligible: true, annualRoom, lifetimeRemaining };
}

// ─── SCENARIO DEFINITIONS ─────────────────────────────────────────────────────

/**
 * Builds 4 different strategies for splitting your savings across accounts.
 *
 * Each strategy answers: "Given $X/month to save, which accounts should I fill first?"
 *
 * Strategy A — Tax Saver (RRSP first):
 *   Get a tax refund now by putting money into your RRSP first.
 *   You'll pay tax later when you withdraw in retirement.
 *
 * Strategy B — Tax-Free Growth (TFSA first):
 *   Your money grows tax-free and you can take it out anytime without penalty.
 *
 * Strategy C — Home Buyer (FHSA first) or Even Split:
 *   If you're a first-time buyer, use the FHSA — you get a tax break AND
 *   tax-free withdrawal for your home. Otherwise, split evenly between RRSP and TFSA.
 *
 * Strategy D — Maximum Flexibility:
 *   Keep most money in a regular account you can access anytime.
 *   Less tax-efficient but useful if you need money before retirement.
 *
 * @param {object} profile - User financial profile
 * @returns {object[]} Array of 4 scenario definitions
 */
function buildScenarios(profile) {
  const annualSavings = profile.monthlySavings * 12;
  const rrspRoom = calcRRSPRoom(profile);
  const tfsaRoom = calcTFSARoom(profile);
  const fhsa     = calcFHSAEligibility(profile);

  // Cap contributions at available room
  const maxRRSP  = Math.min(annualSavings, rrspRoom);
  const maxTFSA  = Math.min(annualSavings, tfsaRoom);
  const maxFHSA  = fhsa.eligible ? Math.min(annualSavings, fhsa.annualRoom) : 0;

  const marginalRate = Math.round(calculateMarginalRate(profile.annualIncome, profile.province) * 100);

  // For FHSA-eligible users, all scenarios fill FHSA first since it combines
  // the RRSP tax deduction with TFSA-like tax-free withdrawal for home purchase.
  // The remaining savings then follow each scenario's priority order.
  const fhsaBase = maxFHSA;

  // ── Scenario A: RRSP Maximizer ──────────────────────────────────────────────
  const a_fhsa   = fhsaBase;
  const a_rem0   = annualSavings - a_fhsa;
  const a_rrsp   = Math.min(a_rem0, maxRRSP);
  const a_rem1   = a_rem0 - a_rrsp;
  const a_tfsa   = Math.min(a_rem1, maxTFSA);
  const a_nonreg = Math.max(0, a_rem1 - a_tfsa);

  // ── Scenario B: TFSA Maximizer ──────────────────────────────────────────────
  const b_fhsa   = fhsaBase;
  const b_rem0   = annualSavings - b_fhsa;
  const b_tfsa   = Math.min(b_rem0, maxTFSA);
  const b_rem1   = b_rem0 - b_tfsa;
  const b_rrsp   = Math.min(b_rem1, maxRRSP);
  const b_nonreg = Math.max(0, b_rem1 - b_rrsp);

  // ── Scenario C: FHSA First (if eligible) or Balanced Split ─────────────────
  let scenarioC;
  if (fhsa.eligible && maxFHSA > 0) {
    const c_fhsa   = maxFHSA;
    const c_rem    = annualSavings - c_fhsa;
    const c_rrsp   = Math.min(c_rem * 0.6, maxRRSP);   // 60% of remainder to RRSP
    const c_tfsa   = Math.min(c_rem - c_rrsp, maxTFSA);
    const c_nonreg = Math.max(0, c_rem - c_rrsp - c_tfsa);
    scenarioC = {
      id: 'fhsa_first',
      name: 'Home Buyer',
      icon: '🏠',
      tagline: 'Save for your first home with the best tax deal in Canada',
      description:
        `The FHSA gives you a tax break when you put money in (like an RRSP) AND ` +
        `you pay zero tax when you take it out to buy your first home (like a TFSA). ` +
        `It's the best savings tool if you're buying your first home — but you can only use it once.`,
      annual: {
        rrsp: Math.round(c_rrsp),
        tfsa: Math.round(c_tfsa),
        fhsa: Math.round(c_fhsa),
        nonRegistered: Math.round(c_nonreg),
      },
    };
  } else {
    const c_rrsp   = Math.min(annualSavings * 0.5, maxRRSP);
    const c_tfsa   = Math.min(annualSavings * 0.5, maxTFSA);
    const c_nonreg = Math.max(0, annualSavings - c_rrsp - c_tfsa);
    scenarioC = {
      id: 'balanced_split',
      name: 'Even Split',
      icon: '⚖️',
      tagline: 'Half in RRSP for tax savings, half in TFSA for flexibility',
      description:
        `Split your savings evenly between an RRSP and a TFSA. ` +
        `You get some tax savings now from the RRSP side, while also building ` +
        `a TFSA that you can dip into anytime without paying tax.`,
      annual: {
        rrsp: Math.round(c_rrsp),
        tfsa: Math.round(c_tfsa),
        fhsa: 0,
        nonRegistered: Math.round(c_nonreg),
      },
    };
  }

  // ── Scenario D: Flexible Growth ─────────────────────────────────────────────
  const d_fhsa   = fhsaBase;
  const d_rem0   = annualSavings - d_fhsa;
  const d_rrsp   = Math.min(d_rem0 * 0.25, maxRRSP);
  const d_tfsa   = Math.min(d_rem0 * 0.25, maxTFSA);
  const d_nonreg = Math.max(0, d_rem0 - d_rrsp - d_tfsa);

  return [
    {
      id: 'rrsp_max',
      name: 'Tax Saver',
      icon: '🏦',
      tagline: `Get a ${marginalRate}% tax refund on every dollar you contribute`,
      description:
        `Put your savings into an RRSP first. Every dollar you contribute reduces your taxable income, ` +
        `so at your ${marginalRate}% tax rate, a $10,000 contribution saves you $${Math.round(marginalRate * 100)} in taxes this year. ` +
        `Your money grows without being taxed until you withdraw it in retirement.`,
      annual: {
        rrsp: Math.round(a_rrsp),
        tfsa: Math.round(a_tfsa),
        fhsa: Math.round(a_fhsa),
        nonRegistered: Math.round(a_nonreg),
      },
    },
    {
      id: 'tfsa_max',
      name: 'Tax-Free Growth',
      icon: '💰',
      tagline: 'Your money grows tax-free and you can take it out anytime',
      description:
        `Put your savings into a TFSA first. You don't get a tax break when you put money in, ` +
        `but everything it earns is yours — you never pay tax on the growth, and you can ` +
        `withdraw at any age without penalty. Great if you think you'll need the money before retirement.`,
      annual: {
        rrsp: Math.round(b_rrsp),
        tfsa: Math.round(b_tfsa),
        fhsa: Math.round(b_fhsa),
        nonRegistered: Math.round(b_nonreg),
      },
    },
    scenarioC,
    {
      id: 'flexible_growth',
      name: 'Maximum Flexibility',
      icon: '📈',
      tagline: 'Keep your money accessible — less tax savings, more freedom',
      description:
        `Put most of your savings in a regular (non-registered) investment account. ` +
        `You'll pay some tax on your gains each year, but you can access your money ` +
        `anytime without restrictions. Good if you want to retire early or might need ` +
        `the money for something unexpected.`,
      annual: {
        rrsp: Math.round(d_rrsp),
        tfsa: Math.round(d_tfsa),
        fhsa: Math.round(d_fhsa),
        nonRegistered: Math.round(d_nonreg),
      },
    },
  ];
}

// ─── MONTE CARLO SIMULATION ───────────────────────────────────────────────────

/**
 * Runs 1,000 Monte Carlo simulations for a single scenario.
 *
 * Each simulation independently samples annual returns from a normal distribution,
 * growing each account type (RRSP, TFSA, FHSA, non-registered) year by year.
 *
 * Tax treatment per account:
 *   - RRSP/FHSA: grow untaxed, but the final value is reduced by RETIREMENT_TAX_RATE
 *                to reflect the tax owing at withdrawal
 *   - TFSA:      grow untaxed, final value is the real after-tax value
 *   - Non-reg:   annual returns are reduced by NON_REG_TAX_DRAG (represents annual
 *                capital gains tax on realized gains)
 *
 * After all 1,000 simulations, the final portfolio values are sorted and
 * percentiles are extracted. The P10 is the "bad outcome" (bottom 10% of scenarios),
 * P50 is the most likely outcome, P90 is the optimistic outcome.
 *
 * Also runs 200 simulations tracking per-year values to produce year-by-year
 * projection bands for the chart.
 *
 * @param {object} scenario - Scenario definition (from buildScenarios)
 * @param {object} profile  - User financial profile
 * @returns {{ summary: { p10, p25, p50, p75, p90 }, byYear: [{year, p10, p50, p90}] }}
 */
function runMonteCarlo(scenario, profile) {
  const allocation = ALLOCATIONS[profile.riskTolerance] ?? ALLOCATIONS.balanced;
  const years = profile.timeHorizon;

  // Starting balances from the user's profile
  const initRRSP   = profile.rrspBalance || 0;
  const initTFSA   = profile.tfsaBalance || 0;
  const initFHSA   = profile.fhsaBalance || 0;
  const initNonReg = profile.nonRegisteredBalance || 0;

  // Annual contributions this scenario routes to each account
  const { rrsp: rrspC, tfsa: tfsaC, fhsa: fhsaC, nonRegistered: nonRegC } = scenario.annual;

  // Whether FHSA should be treated as tax-free (home purchase goal) or RRSP-like
  const fhsaTaxFree = profile.primaryGoal === 'buy_home';

  // ── Full simulations (1000 runs) to get final value distribution ─────────────
  const finalValues = [];

  for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
    let rrsp   = initRRSP;
    let tfsa   = initTFSA;
    let fhsa   = initFHSA;
    let nonReg = initNonReg;

    for (let year = 0; year < years; year++) {
      const r = normalRandom(allocation.mean, allocation.std);

      // Each account grows at the same simulated return for simplicity.
      // In reality, different accounts might hold different assets — but for a
      // demo model, the key differentiator is tax treatment, not asset allocation.
      rrsp   = (rrsp   + rrspC)   * (1 + r);
      tfsa   = (tfsa   + tfsaC)   * (1 + r);
      fhsa   = (fhsa   + fhsaC)   * (1 + r);

      // Non-registered: tax drag on positive returns only
      // (you can't claim a deduction on paper losses in this simplified model)
      const nonRegR = r > 0 ? r * (1 - NON_REG_TAX_DRAG) : r;
      nonReg = (nonReg + nonRegC) * (1 + nonRegR);
    }

    // Convert to after-tax net worth equivalent
    const atRRSP   = rrsp   * (1 - RETIREMENT_TAX_RATE);
    const atFHSA   = fhsaTaxFree ? fhsa : fhsa * (1 - RETIREMENT_TAX_RATE);
    finalValues.push(Math.round(atRRSP + tfsa + atFHSA + nonReg));
  }

  finalValues.sort((a, b) => a - b);

  // ── Per-year projection bands (200 runs) for the chart ───────────────────────
  // We use fewer simulations here because we're storing O(years) values per sim.
  const CHART_SIMS = 200;
  const yearlyBuckets = Array.from({ length: years }, () => []);

  for (let sim = 0; sim < CHART_SIMS; sim++) {
    let rrsp   = initRRSP;
    let tfsa   = initTFSA;
    let fhsa   = initFHSA;
    let nonReg = initNonReg;

    for (let year = 0; year < years; year++) {
      const r = normalRandom(allocation.mean, allocation.std);
      rrsp   = (rrsp   + rrspC)   * (1 + r);
      tfsa   = (tfsa   + tfsaC)   * (1 + r);
      fhsa   = (fhsa   + fhsaC)   * (1 + r);
      const nonRegR = r > 0 ? r * (1 - NON_REG_TAX_DRAG) : r;
      nonReg = (nonReg + nonRegC) * (1 + nonRegR);

      const atRRSP = rrsp * (1 - RETIREMENT_TAX_RATE);
      const atFHSA = fhsaTaxFree ? fhsa : fhsa * (1 - RETIREMENT_TAX_RATE);
      yearlyBuckets[year].push(Math.round(atRRSP + tfsa + atFHSA + nonReg));
    }
  }

  const byYear = yearlyBuckets.map((bucket, i) => {
    bucket.sort((a, b) => a - b);
    return {
      year: i + 1,
      p10: percentile(bucket, 10),
      p50: percentile(bucket, 50),
      p90: percentile(bucket, 90),
    };
  });

  return {
    summary: {
      p10: percentile(finalValues, 10),
      p25: percentile(finalValues, 25),
      p50: percentile(finalValues, 50),
      p75: percentile(finalValues, 75),
      p90: percentile(finalValues, 90),
    },
    byYear,
    allocationLabel: allocation.label,
  };
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

/**
 * Entry point for the financial engine.
 *
 * Takes a user profile, builds 4 scenarios, runs Monte Carlo simulations,
 * and returns all data needed for Claude to narrate and the frontend to display.
 *
 * Called by the Express API handler in backend/index.js.
 *
 * @param {object} profile - Validated user financial profile
 * @returns {{
 *   scenarios:         object[],  - 4 scenarios with projections
 *   taxSummary:        object,    - Federal + provincial tax breakdown
 *   contributionRooms: object,    - RRSP/TFSA/FHSA room this year
 * }}
 */
export function generateScenarioData(profile) {
  const scenarios = buildScenarios(profile);

  const scenariosWithProjections = scenarios.map(scenario => {
    const mc = runMonteCarlo(scenario, profile);

    // Tax saving from deductible contributions (RRSP + FHSA are both tax-deductible)
    const deductibleContribs = scenario.annual.rrsp + scenario.annual.fhsa;
    const rrspTaxSaving = Math.round(
      calculateRRSPTaxSaving(deductibleContribs, profile.annualIncome, profile.province)
    );

    return {
      ...scenario,
      projections:    mc.summary,
      byYear:         mc.byYear,
      allocationLabel: mc.allocationLabel,
      rrspTaxSaving,
      // Monthly breakdown for the UI (annual ÷ 12)
      monthly: {
        rrsp:           Math.round(scenario.annual.rrsp / 12),
        tfsa:           Math.round(scenario.annual.tfsa / 12),
        fhsa:           Math.round(scenario.annual.fhsa / 12),
        nonRegistered:  Math.round(scenario.annual.nonRegistered / 12),
      },
    };
  });

  const taxSummary       = getTaxSummary(profile.annualIncome, profile.province);
  const rrspRoom         = calcRRSPRoom(profile);
  const tfsaRoom         = calcTFSARoom(profile);
  const fhsaEligibility  = calcFHSAEligibility(profile);

  return {
    scenarios: scenariosWithProjections,
    taxSummary,
    contributionRooms: {
      rrsp:         rrspRoom,
      tfsa:         tfsaRoom,
      fhsa:         fhsaEligibility.eligible ? fhsaEligibility.annualRoom : 0,
      fhsaEligible: fhsaEligibility.eligible,
    },
  };
}
