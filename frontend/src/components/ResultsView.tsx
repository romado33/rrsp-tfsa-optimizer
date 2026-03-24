import type { FinancialProfile, AnalysisResult, Scenario } from '../types';
import { fmtK } from '../utils/format';
import { severityColor } from '../utils/format';
import { GOAL_OPTIONS, RISK_OPTIONS } from '../utils/constants';
import ScenarioCard from './ScenarioCard';
import GrowthChart from './GrowthChart';
import ComparisonTable from './ComparisonTable';
import SmartTips from './SmartTips';
import Glossary from './Glossary';

export default function ResultsView({
  profile,
  result,
  selectedScenarioId,
  onSelectScenario,
  onEditProfile,
}: {
  profile: FinancialProfile;
  result: AnalysisResult;
  selectedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  onEditProfile: () => void;
}) {
  const { scenarios, taxSummary, contributionRooms, decisionGate } = result;
  const recommendedId = decisionGate?.recommendedScenarioId;
  const maxProjection = Math.max(...scenarios.map((s) => s.projections.p90)) * 1.05;

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios.find((s) => s.id === recommendedId) ?? scenarios[0];

  return (
    <>
      {/* Results header + Print button */}
      <div className="results-header">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h2>Your Savings Strategies</h2>
            <p>
              {profile.timeHorizon}-year plan ·{' '}
              {RISK_OPTIONS.find((r) => r.value === profile.riskTolerance)?.label ?? profile.riskTolerance} ·{' '}
              {GOAL_OPTIONS.find((g) => g.value === profile.primaryGoal)?.label}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="print-btn" onClick={() => window.print()}>
              🖨️ Print / Save PDF
            </button>
            <button className="btn-secondary" onClick={onEditProfile}>
              ← Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tax Snapshot */}
      <div className="tax-snapshot">
        <div className="tax-stat">
          <div className="stat-value">{taxSummary.marginalRate}%</div>
          <div className="stat-label">Tax on Next $1 Earned</div>
        </div>
        <div className="tax-stat">
          <div className="stat-value">{taxSummary.effectiveRate}%</div>
          <div className="stat-label">Overall Tax Rate</div>
        </div>
        <div className="tax-stat">
          <div className="stat-value">{fmtK(taxSummary.afterTaxIncome)}</div>
          <div className="stat-label">Take-Home Pay</div>
        </div>
        <div className="tax-stat">
          <div className="stat-value">{fmtK(contributionRooms.rrsp)}</div>
          <div className="stat-label">RRSP Room Left</div>
        </div>
        {contributionRooms.rdspEnabled && (
          <div className="tax-stat">
            <div className="stat-value">{fmtK(contributionRooms.rdspGrant + contributionRooms.rdspBond)}</div>
            <div className="stat-label">RDSP Govt Match/yr</div>
          </div>
        )}
      </div>

      {/* Personalized Tips */}
      <SmartTips
        profile={profile}
        taxSummary={taxSummary}
        contributionRooms={contributionRooms}
        scenarios={scenarios}
      />

      {/* Scenario Cards */}
      <div className="section-callout">
        <span className="callout-icon">📊</span>
        <span>
          <strong>4 strategies compared side by side</strong> — click any card to see its
          year-by-year growth below. Other tools only show one account at a time.
        </span>
      </div>
      <div className="results-grid">
        {scenarios.map((scenario: Scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            isSelected={selectedScenarioId === scenario.id}
            isRecommended={scenario.id === recommendedId}
            maxProjection={maxProjection}
            onClick={() => onSelectScenario(scenario.id)}
          />
        ))}
      </div>

      {/* Year-by-Year Growth Chart */}
      <div className="section-callout">
        <span className="callout-icon">🎲</span>
        <span>
          <strong>Not just one number — the full range</strong> of possible outcomes from
          1,000 simulations. The green band shows where you&apos;ll most likely end up.
        </span>
      </div>
      {selectedScenario?.byYear?.length > 0 && (
        <GrowthChart
          byYear={selectedScenario.byYear}
          title={`Year-by-year projection: ${selectedScenario.name}`}
        />
      )}

      {/* Side-by-Side Comparison Table */}
      <ComparisonTable scenarios={scenarios} recommendedId={recommendedId} />

      {/* Risks Panel */}
      {decisionGate?.risks?.length > 0 && (
        <div className="risks-panel">
          <h3>⚠️ Key Risks to Your Plan</h3>
          <div className="risk-list">
            {decisionGate.risks.map((risk, i) => (
              <div key={i} className={severityColor(risk.severity)}>
                <div className="risk-item-body">
                  <div className="risk-name">{risk.name}</div>
                  <div className="risk-description">{risk.description}</div>
                  <div className="risk-impact">{risk.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Human / AI Decision Gate */}
      <div className="section-callout">
        <span className="callout-icon">🧠</span>
        <span>
          <strong>Honest AI</strong> — most tools just give you an answer. Ours tells you what
          it figured out AND what only you can decide. No pretending to know your future.
        </span>
      </div>
      {decisionGate && (
        <div className="decision-gate">
          <div className="decision-gate-header">
            <div>
              <h3>AI Recommendation</h3>
              <div
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}
              >
                Recommended: <strong>{decisionGate.recommendedScenarioName}</strong> ·{' '}
                {decisionGate.confidenceReason}
              </div>
            </div>
            <div className="confidence-badge">
              {decisionGate.confidence.toUpperCase()} CONFIDENCE
            </div>
          </div>

          <div className="decision-gate-body">
            <div>
              <div className="decision-section-title ai-color">
                🤖 What the AI figured out
              </div>
              <ul className="decision-list">
                {decisionGate.aiAnalyzed?.map((item, i) => (
                  <li key={i}>
                    <span className="list-icon ai-icon">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="decision-section-title human-color">
                🧠 Things only you know
              </div>
              <ul className="decision-list">
                {decisionGate.humanMustDecide?.map((item, i) => (
                  <li key={i}>
                    <span className="list-icon human-icon">?</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="decision-gate-footer">
            <div className="bottom-line">{decisionGate.bottomLine}</div>
            <div className="human-gate-notice">
              <span style={{ fontSize: 18 }}>⚖️</span>
              <span>
                <strong>This is not financial advice.</strong> The AI crunched the numbers,
                but the final call is yours. If there&apos;s a lot of money at stake,
                it&apos;s worth talking to a real financial advisor.
              </span>
            </div>
          </div>
        </div>
      )}

      <Glossary />

      <div style={{ height: 48 }} />
    </>
  );
}
