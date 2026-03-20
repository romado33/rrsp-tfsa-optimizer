import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateFederalTax,
  calculateProvincialTax,
  calculateMarginalRate,
  calculateRRSPTaxSaving,
  getTaxSummary,
} from '../lib/canadianTax.js';

// ─── FEDERAL TAX ──────────────────────────────────────────────────────────────

describe('calculateFederalTax', () => {
  it('returns 0 for income at or below the BPA credit', () => {
    const tax = calculateFederalTax(15705);
    assert.equal(tax, 0);
  });

  it('returns 0 for zero income', () => {
    assert.equal(calculateFederalTax(0), 0);
  });

  it('calculates correctly for income in the first bracket ($50,000)', () => {
    // 2025: Gross tax: 50000 * 0.145 = 7250
    // BPA credit: 16129 * 0.145 = 2338.705
    // Net: 7250 - 2338.705 = 4911.295
    const tax = calculateFederalTax(50000);
    assert.ok(Math.abs(tax - 4911.295) < 0.01, `Expected ~4911.30, got ${tax}`);
  });

  it('calculates correctly for income spanning two brackets ($90,000)', () => {
    // 2025: Bracket 1: 57375 * 0.145 = 8319.375
    // Bracket 2: (90000 - 57375) * 0.205 = 32625 * 0.205 = 6688.125
    // Gross: 15007.50
    // BPA credit: 16129 * 0.145 = 2338.705
    // Net: 12668.795
    const tax = calculateFederalTax(90000);
    assert.ok(Math.abs(tax - 12668.795) < 0.01, `Expected ~12668.80, got ${tax}`);
  });

  it('handles very high income ($500,000) across all brackets', () => {
    const tax = calculateFederalTax(500000);
    assert.ok(tax > 100000, `Expected tax > 100k for 500k income, got ${tax}`);
  });
});

// ─── PROVINCIAL TAX ───────────────────────────────────────────────────────────

describe('calculateProvincialTax', () => {
  it('calculates Ontario tax for $90,000 income', () => {
    const tax = calculateProvincialTax(90000, 'ON');
    assert.ok(tax > 3000 && tax < 8000, `Ontario tax on 90k should be 3k-8k, got ${tax}`);
  });

  it('calculates Alberta tax for $90,000 income', () => {
    const tax = calculateProvincialTax(90000, 'AB');
    assert.ok(tax > 3000 && tax < 10000, `Alberta tax on 90k should be 3k-10k, got ${tax}`);
  });

  it('falls back to Ontario for unknown province', () => {
    const taxUnknown = calculateProvincialTax(90000, 'XX');
    const taxON = calculateProvincialTax(90000, 'ON');
    assert.equal(taxUnknown, taxON);
  });

  it('returns 0 for zero income', () => {
    for (const prov of ['ON', 'BC', 'AB', 'QC', 'MB']) {
      assert.equal(calculateProvincialTax(0, prov), 0);
    }
  });

  it('calculates for all supported provinces without error', () => {
    for (const prov of ['ON', 'BC', 'AB', 'QC', 'MB']) {
      const tax = calculateProvincialTax(120000, prov);
      assert.ok(tax > 0, `${prov} should have positive tax on 120k`);
    }
  });
});

// ─── MARGINAL RATE ────────────────────────────────────────────────────────────

describe('calculateMarginalRate', () => {
  it('returns combined federal + provincial rate', () => {
    const rate = calculateMarginalRate(90000, 'ON');
    // 2025: Federal: 20.5% (second bracket), Ontario: 9.15% (second bracket)
    assert.ok(Math.abs(rate - 0.2965) < 0.001, `Expected ~0.2965, got ${rate}`);
  });

  it('returns lowest bracket rate for very low income', () => {
    const rate = calculateMarginalRate(10000, 'ON');
    // 2025: Federal 14.5% + Ontario 5.05% = 19.55%
    assert.ok(Math.abs(rate - 0.1955) < 0.001, `Expected ~0.1955, got ${rate}`);
  });

  it('returns highest bracket rates for very high income', () => {
    const rate = calculateMarginalRate(300000, 'ON');
    // Federal 33% + Ontario 13.16% = 46.16%
    assert.ok(rate > 0.45, `Expected rate > 0.45 for 300k ON, got ${rate}`);
  });
});

// ─── RRSP TAX SAVING ─────────────────────────────────────────────────────────

describe('calculateRRSPTaxSaving', () => {
  it('returns positive savings for any non-zero contribution', () => {
    const saving = calculateRRSPTaxSaving(5000, 90000, 'ON');
    assert.ok(saving > 0, `Expected positive saving, got ${saving}`);
  });

  it('bracket-spanning: large contribution saves less per dollar than small one', () => {
    const smallSaving = calculateRRSPTaxSaving(1000, 90000, 'ON');
    const largeSaving = calculateRRSPTaxSaving(40000, 90000, 'ON');
    const smallRate = smallSaving / 1000;
    const largeRate = largeSaving / 40000;
    assert.ok(
      largeRate <= smallRate + 0.001,
      `Large contribution effective rate (${largeRate}) should be <= small (${smallRate})`,
    );
  });

  it('returns 0 when contribution is 0', () => {
    assert.equal(calculateRRSPTaxSaving(0, 90000, 'ON'), 0);
  });

  it('handles contribution larger than income', () => {
    const saving = calculateRRSPTaxSaving(100000, 50000, 'ON');
    // Should equal total tax on 50k (reducing income to 0)
    const totalTax = calculateFederalTax(50000) + calculateProvincialTax(50000, 'ON');
    assert.ok(Math.abs(saving - totalTax) < 0.01, `Expected saving to equal total tax on 50k`);
  });
});

// ─── TAX SUMMARY ──────────────────────────────────────────────────────────────

describe('getTaxSummary', () => {
  it('returns all expected fields', () => {
    const summary = getTaxSummary(90000, 'ON');
    assert.ok('totalTax' in summary);
    assert.ok('effectiveRate' in summary);
    assert.ok('marginalRate' in summary);
    assert.ok('afterTaxIncome' in summary);
  });

  it('effective rate is less than marginal rate (progressive system)', () => {
    const summary = getTaxSummary(90000, 'ON');
    assert.ok(
      summary.effectiveRate < summary.marginalRate,
      `Effective (${summary.effectiveRate}) should be < marginal (${summary.marginalRate})`,
    );
  });

  it('totalTax + afterTaxIncome equals income', () => {
    const income = 90000;
    const summary = getTaxSummary(income, 'ON');
    assert.equal(summary.totalTax + summary.afterTaxIncome, income);
  });

  it('rates are percentages, not decimals', () => {
    const summary = getTaxSummary(90000, 'ON');
    assert.ok(summary.marginalRate > 1, 'Marginal rate should be > 1 (percent, not decimal)');
    assert.ok(summary.effectiveRate > 1, 'Effective rate should be > 1 (percent, not decimal)');
  });
});
