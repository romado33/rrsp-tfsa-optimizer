import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateScenarioData } from '../lib/financialEngine.js';

const BASE_PROFILE = {
  age: 32,
  province: 'ON',
  annualIncome: 90000,
  rrspBalance: 18000,
  rrspRoom: 8000,
  tfsaBalance: 15000,
  tfsaRoom: 7000,
  fhsaBalance: 0,
  nonRegisteredBalance: 5000,
  monthlySavings: 2500,
  riskTolerance: 'balanced',
  primaryGoal: 'buy_home',
  timeHorizon: 10,
  isFirstTimeBuyer: true,
};

// ─── SCENARIO GENERATION ──────────────────────────────────────────────────────

describe('generateScenarioData', () => {
  it('returns exactly 4 scenarios', () => {
    const result = generateScenarioData(BASE_PROFILE);
    assert.equal(result.scenarios.length, 4);
  });

  it('returns taxSummary and contributionRooms', () => {
    const result = generateScenarioData(BASE_PROFILE);
    assert.ok(result.taxSummary);
    assert.ok(result.contributionRooms);
  });

  it('each scenario has required fields', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      assert.ok(s.id, 'Missing scenario id');
      assert.ok(s.name, 'Missing scenario name');
      assert.ok(s.annual, 'Missing annual breakdown');
      assert.ok(s.monthly, 'Missing monthly breakdown');
      assert.ok(s.projections, 'Missing projections');
      assert.ok(s.byYear, 'Missing byYear');
      assert.ok(typeof s.rrspTaxSaving === 'number', 'Missing rrspTaxSaving');
    }
  });

  it('scenario IDs are unique', () => {
    const result = generateScenarioData(BASE_PROFILE);
    const ids = result.scenarios.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${ids}`);
  });

  it('annual allocations sum to annual savings for each scenario', () => {
    const annualSavings = BASE_PROFILE.monthlySavings * 12;
    const result = generateScenarioData(BASE_PROFILE);

    for (const s of result.scenarios) {
      const total = s.annual.rrsp + s.annual.tfsa + s.annual.fhsa + s.annual.nonRegistered;
      assert.ok(
        Math.abs(total - annualSavings) <= 4, // allow small rounding
        `${s.id}: allocations sum to ${total}, expected ~${annualSavings}`,
      );
    }
  });

  it('monthly values are annual ÷ 12', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      assert.equal(s.monthly.rrsp, Math.round(s.annual.rrsp / 12));
      assert.equal(s.monthly.tfsa, Math.round(s.annual.tfsa / 12));
      assert.equal(s.monthly.fhsa, Math.round(s.annual.fhsa / 12));
      assert.equal(s.monthly.nonRegistered, Math.round(s.annual.nonRegistered / 12));
    }
  });
});

// ─── MONTE CARLO PROJECTIONS ──────────────────────────────────────────────────

describe('Monte Carlo projections', () => {
  it('projections are ordered: p10 <= p25 <= p50 <= p75 <= p90', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      const { p10, p25, p50, p75, p90 } = s.projections;
      assert.ok(p10 <= p25, `${s.id}: p10 (${p10}) > p25 (${p25})`);
      assert.ok(p25 <= p50, `${s.id}: p25 (${p25}) > p50 (${p50})`);
      assert.ok(p50 <= p75, `${s.id}: p50 (${p50}) > p75 (${p75})`);
      assert.ok(p75 <= p90, `${s.id}: p75 (${p75}) > p90 (${p90})`);
    }
  });

  it('all projections are positive (with starting balances + contributions)', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      assert.ok(s.projections.p10 > 0, `${s.id}: p10 should be positive`);
    }
  });

  it('byYear has correct number of entries', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      assert.equal(s.byYear.length, BASE_PROFILE.timeHorizon, `${s.id}: byYear length mismatch`);
    }
  });

  it('byYear is ordered: p10 <= p50 <= p90 each year', () => {
    const result = generateScenarioData(BASE_PROFILE);
    for (const s of result.scenarios) {
      for (const yr of s.byYear) {
        assert.ok(yr.p10 <= yr.p50, `${s.id} yr${yr.year}: p10 > p50`);
        assert.ok(yr.p50 <= yr.p90, `${s.id} yr${yr.year}: p50 > p90`);
      }
    }
  });
});

// ─── CONTRIBUTION ROOMS ───────────────────────────────────────────────────────

describe('Contribution rooms', () => {
  it('RRSP room includes carried-forward room', () => {
    const result = generateScenarioData(BASE_PROFILE);
    assert.ok(
      result.contributionRooms.rrsp >= BASE_PROFILE.rrspRoom,
      'RRSP room should be >= carried-forward room',
    );
  });

  it('FHSA is eligible for first-time buyer', () => {
    const result = generateScenarioData(BASE_PROFILE);
    assert.equal(result.contributionRooms.fhsaEligible, true);
    assert.ok(result.contributionRooms.fhsa > 0);
  });

  it('FHSA is not eligible when not first-time buyer', () => {
    const result = generateScenarioData({ ...BASE_PROFILE, isFirstTimeBuyer: false });
    assert.equal(result.contributionRooms.fhsaEligible, false);
    assert.equal(result.contributionRooms.fhsa, 0);
  });
});

// ─── RISK TOLERANCE ───────────────────────────────────────────────────────────

describe('Risk tolerance impact', () => {
  it('aggressive has higher median than conservative (most of the time)', () => {
    // Run multiple times to reduce flakiness — Monte Carlo is random
    let aggHigher = 0;
    const runs = 5;
    for (let i = 0; i < runs; i++) {
      const agg = generateScenarioData({ ...BASE_PROFILE, riskTolerance: 'aggressive' });
      const con = generateScenarioData({ ...BASE_PROFILE, riskTolerance: 'conservative' });
      const aggMedian = agg.scenarios[0].projections.p50;
      const conMedian = con.scenarios[0].projections.p50;
      if (aggMedian > conMedian) aggHigher++;
    }
    assert.ok(aggHigher >= 3, `Aggressive should beat conservative in >=3/${runs} runs, got ${aggHigher}`);
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles 1-year time horizon', () => {
    const result = generateScenarioData({ ...BASE_PROFILE, timeHorizon: 1 });
    assert.equal(result.scenarios.length, 4);
    for (const s of result.scenarios) {
      assert.equal(s.byYear.length, 1);
    }
  });

  it('handles zero starting balances', () => {
    const result = generateScenarioData({
      ...BASE_PROFILE,
      rrspBalance: 0,
      tfsaBalance: 0,
      fhsaBalance: 0,
      nonRegisteredBalance: 0,
      rrspRoom: 0,
      tfsaRoom: 0,
    });
    assert.equal(result.scenarios.length, 4);
  });

  it('handles very high income', () => {
    const result = generateScenarioData({ ...BASE_PROFILE, annualIncome: 500000 });
    assert.equal(result.scenarios.length, 4);
    assert.ok(result.taxSummary.marginalRate > 40);
  });
});
