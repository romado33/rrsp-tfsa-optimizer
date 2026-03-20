/**
 * canadianTax.js
 *
 * Canadian federal and provincial income tax calculations for 2025.
 *
 * Used by the financial engine to:
 *   - Calculate immediate tax savings from RRSP/FHSA contributions
 *   - Show the user their effective and marginal tax rates
 *   - Personalize scenario narration with real dollar figures
 *
 * How Canadian income tax works (simplified):
 *   1. Your income falls into "brackets" — each bracket has a tax rate.
 *   2. Only the income WITHIN each bracket is taxed at that rate (this is
 *      called a "progressive" system — you don't suddenly pay more on ALL
 *      your income when you move up a bracket).
 *   3. Federal and provincial taxes are calculated separately and added together.
 *   4. A "Basic Personal Amount" means a chunk of your income is tax-free.
 *
 * Limitations:
 *   - Does not include CPP/EI deductions (~$4k/year for most workers)
 *   - Does not include Ontario surtax or Quebec abatement
 *   - Does not include credits beyond the basic personal amount
 *   - Does not include Alternative Minimum Tax
 *   - Always consult a real accountant for financial decisions
 *
 * Sources:
 *   - Federal: canada.ca/en/revenue-agency (2025 tax year)
 *   - Provincial: respective provincial finance ministries (2025 tax year)
 *   - KPMG 2025 Federal and Provincial/Territorial Income Tax Rates
 */

// ─── FEDERAL TAX BRACKETS (2025) ─────────────────────────────────────────────
// The 2025 lowest rate is 14.5% (blended due to mid-year cut from 15% to 14%).
const FEDERAL_BRACKETS = [
  { min: 0,       max: 57375,    rate: 0.1450 },
  { min: 57375,   max: 114750,   rate: 0.2050 },
  { min: 114750,  max: 177882,   rate: 0.2600 },
  { min: 177882,  max: 253414,   rate: 0.2900 },
  { min: 253414,  max: Infinity, rate: 0.3300 },
];

// The Basic Personal Amount — the first $16,129 of income is effectively tax-free.
const FEDERAL_BPA = 16129;

// ─── PROVINCIAL TAX BRACKETS (2025) ──────────────────────────────────────────
export const PROVINCIAL_BRACKETS = {
  ON: {
    name: 'Ontario',
    bpa: 12989,
    brackets: [
      { min: 0,       max: 52886,    rate: 0.0505 },
      { min: 52886,   max: 105775,   rate: 0.0915 },
      { min: 105775,  max: 150000,   rate: 0.1116 },
      { min: 150000,  max: 220000,   rate: 0.1216 },
      { min: 220000,  max: Infinity, rate: 0.1316 },
    ],
  },
  BC: {
    name: 'British Columbia',
    bpa: 13216,
    brackets: [
      { min: 0,       max: 49279,    rate: 0.0506 },
      { min: 49279,   max: 98560,    rate: 0.0770 },
      { min: 98560,   max: 113158,   rate: 0.1050 },
      { min: 113158,  max: 137407,   rate: 0.1229 },
      { min: 137407,  max: 186306,   rate: 0.1470 },
      { min: 186306,  max: 259829,   rate: 0.1680 },
      { min: 259829,  max: Infinity, rate: 0.2050 },
    ],
  },
  AB: {
    name: 'Alberta',
    bpa: 22769,
    brackets: [
      { min: 0,       max: 60000,    rate: 0.0800 },
      { min: 60000,   max: 151234,   rate: 0.1000 },
      { min: 151234,  max: 181481,   rate: 0.1200 },
      { min: 181481,  max: 241974,   rate: 0.1300 },
      { min: 241974,  max: 362961,   rate: 0.1400 },
      { min: 362961,  max: Infinity, rate: 0.1500 },
    ],
  },
  QC: {
    name: 'Québec',
    bpa: 18952,
    brackets: [
      { min: 0,       max: 53255,    rate: 0.1400 },
      { min: 53255,   max: 106495,   rate: 0.1900 },
      { min: 106495,  max: 129590,   rate: 0.2400 },
      { min: 129590,  max: Infinity, rate: 0.2575 },
    ],
  },
  MB: {
    name: 'Manitoba',
    bpa: 15780,
    brackets: [
      { min: 0,       max: 47000,    rate: 0.1080 },
      { min: 47000,   max: 100000,   rate: 0.1275 },
      { min: 100000,  max: Infinity, rate: 0.1740 },
    ],
  },
  SK: {
    name: 'Saskatchewan',
    bpa: 20381,
    brackets: [
      { min: 0,       max: 53463,    rate: 0.1050 },
      { min: 53463,   max: 152750,   rate: 0.1250 },
      { min: 152750,  max: Infinity, rate: 0.1450 },
    ],
  },
  NB: {
    name: 'New Brunswick',
    bpa: 13664,
    brackets: [
      { min: 0,       max: 51306,    rate: 0.0940 },
      { min: 51306,   max: 102614,   rate: 0.1400 },
      { min: 102614,  max: 190060,   rate: 0.1600 },
      { min: 190060,  max: Infinity, rate: 0.1950 },
    ],
  },
  NS: {
    name: 'Nova Scotia',
    bpa: 11932,
    brackets: [
      { min: 0,       max: 30507,    rate: 0.0879 },
      { min: 30507,   max: 61015,    rate: 0.1495 },
      { min: 61015,   max: 95883,    rate: 0.1667 },
      { min: 95883,   max: 154650,   rate: 0.1750 },
      { min: 154650,  max: Infinity, rate: 0.2100 },
    ],
  },
  PE: {
    name: 'Prince Edward Island',
    bpa: 15000,
    brackets: [
      { min: 0,       max: 33328,    rate: 0.0950 },
      { min: 33328,   max: 64656,    rate: 0.1347 },
      { min: 64656,   max: 105000,   rate: 0.1660 },
      { min: 105000,  max: 140000,   rate: 0.1762 },
      { min: 140000,  max: Infinity, rate: 0.1900 },
    ],
  },
  NL: {
    name: 'Newfoundland and Labrador',
    bpa: 11188,
    brackets: [
      { min: 0,       max: 44192,    rate: 0.0870 },
      { min: 44192,   max: 88382,    rate: 0.1450 },
      { min: 88382,   max: 157792,   rate: 0.1580 },
      { min: 157792,  max: 220910,   rate: 0.1780 },
      { min: 220910,  max: 282214,   rate: 0.1980 },
      { min: 282214,  max: 564429,   rate: 0.2080 },
      { min: 564429,  max: 1128858,  rate: 0.2130 },
      { min: 1128858, max: Infinity, rate: 0.2180 },
    ],
  },
  NT: {
    name: 'Northwest Territories',
    bpa: 22769,
    brackets: [
      { min: 0,       max: 51964,    rate: 0.0590 },
      { min: 51964,   max: 103930,   rate: 0.0860 },
      { min: 103930,  max: 168967,   rate: 0.1220 },
      { min: 168967,  max: Infinity, rate: 0.1405 },
    ],
  },
  NU: {
    name: 'Nunavut',
    bpa: 19659,
    brackets: [
      { min: 0,       max: 54707,    rate: 0.0400 },
      { min: 54707,   max: 109413,   rate: 0.0700 },
      { min: 109413,  max: 177881,   rate: 0.0900 },
      { min: 177881,  max: Infinity, rate: 0.1150 },
    ],
  },
  YT: {
    name: 'Yukon',
    bpa: 16452,
    brackets: [
      { min: 0,       max: 57375,    rate: 0.0640 },
      { min: 57375,   max: 114750,   rate: 0.0900 },
      { min: 114750,  max: 177882,   rate: 0.1090 },
      { min: 177882,  max: 500000,   rate: 0.1280 },
      { min: 500000,  max: Infinity, rate: 0.1500 },
    ],
  },
};

// ─── CORE CALCULATION HELPERS ─────────────────────────────────────────────────

/**
 * Applies a progressive bracket table to a given income.
 *
 * Walks each bracket and taxes only the portion of income that falls within it.
 *
 * @param {number} income   - Taxable income (before any credits)
 * @param {Array}  brackets - Array of { min, max, rate }
 * @returns {number} Gross tax before credits
 */
function applyBrackets(income, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Calculates federal income tax after the Basic Personal Amount credit.
 *
 * @param {number} income - Gross income
 * @returns {number} Federal tax owing
 */
export function calculateFederalTax(income) {
  const grossTax = applyBrackets(income, FEDERAL_BRACKETS);
  const bpaCredit = FEDERAL_BPA * FEDERAL_BRACKETS[0].rate;
  return Math.max(0, grossTax - bpaCredit);
}

/**
 * Calculates provincial income tax after the provincial basic personal credit.
 * Falls back to Ontario if an unrecognized province code is passed.
 *
 * @param {number} income   - Gross income
 * @param {string} province - Province code: ON, BC, AB, QC, MB, etc.
 * @returns {number} Provincial tax owing
 */
export function calculateProvincialTax(income, province) {
  const config = PROVINCIAL_BRACKETS[province] ?? PROVINCIAL_BRACKETS['ON'];
  const grossTax = applyBrackets(income, config.brackets);
  const bpaCredit = config.bpa * config.brackets[0].rate;
  return Math.max(0, grossTax - bpaCredit);
}

/**
 * Calculates the combined federal + provincial tax rate on your next dollar of income.
 *
 * This is the rate that determines how much you save when you put money into an RRSP:
 *   "If I put $10,000 into my RRSP, my taxable income drops by $10,000.
 *    At a 30% combined rate, I save $3,000 in taxes this year."
 *
 * @param {number} income   - Current gross income
 * @param {string} province - Province code
 * @returns {number} Combined rate as a decimal (e.g., 0.30)
 */
export function calculateMarginalRate(income, province) {
  let federalRate = FEDERAL_BRACKETS[0].rate;
  for (const b of FEDERAL_BRACKETS) {
    if (income > b.min) federalRate = b.rate;
  }

  const config = PROVINCIAL_BRACKETS[province] ?? PROVINCIAL_BRACKETS['ON'];
  let provincialRate = config.brackets[0].rate;
  for (const b of config.brackets) {
    if (income > b.min) provincialRate = b.rate;
  }

  return federalRate + provincialRate;
}

/**
 * Calculates the immediate tax refund from an RRSP or FHSA contribution.
 *
 * Uses the proper bracket-spanning approach: tax(income) - tax(income - contribution).
 * This is more accurate than a simple multiplication for large contributions
 * that cross bracket boundaries.
 *
 * @param {number} contributionAmount - Dollar amount contributed
 * @param {number} income             - Current gross income
 * @param {string} province           - Province code
 * @returns {number} Tax saving this year
 */
export function calculateRRSPTaxSaving(contributionAmount, income, province) {
  const reducedIncome = Math.max(0, income - contributionAmount);

  const taxBefore = calculateFederalTax(income) + calculateProvincialTax(income, province);
  const taxAfter  = calculateFederalTax(reducedIncome) + calculateProvincialTax(reducedIncome, province);

  return taxBefore - taxAfter;
}

/**
 * Returns a complete tax summary for the user's situation.
 *
 * @param {number} income   - Gross income
 * @param {string} province - Province code
 * @returns {{ totalTax, effectiveRate, marginalRate, afterTaxIncome }}
 */
export function getTaxSummary(income, province) {
  const federal = calculateFederalTax(income);
  const provincial = calculateProvincialTax(income, province);
  const totalTax = federal + provincial;

  return {
    totalTax:       Math.round(totalTax),
    effectiveRate:  Math.round((totalTax / income) * 1000) / 10,
    marginalRate:   Math.round(calculateMarginalRate(income, province) * 1000) / 10,
    afterTaxIncome: Math.round(income - totalTax),
  };
}
