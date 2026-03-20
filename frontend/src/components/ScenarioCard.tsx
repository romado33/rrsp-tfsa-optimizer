import type { Scenario } from '../types';
import { fmtFull } from '../utils/format';
import ProjectionBar from './ProjectionBar';

export default function ScenarioCard({
  scenario,
  isSelected,
  isRecommended,
  maxProjection,
  onClick,
}: {
  scenario: Scenario;
  isSelected: boolean;
  isRecommended: boolean;
  maxProjection: number;
  onClick: () => void;
}) {
  return (
    <div
      className={`scenario-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended-card' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-pressed={isSelected}
    >
      {isRecommended && <div className="recommended-badge">⭐ AI Pick</div>}

      <div className="scenario-card-header">
        <span className="scenario-icon">{scenario.icon}</span>
        <div>
          <div className="scenario-card-title">{scenario.name}</div>
          <div className="scenario-card-tagline">{scenario.tagline}</div>
        </div>
      </div>

      <ProjectionBar
        p10={scenario.projections.p10}
        p50={scenario.projections.p50}
        p90={scenario.projections.p90}
        maxVal={maxProjection}
      />

      {scenario.rrspTaxSaving > 0 && (
        <div className="tax-saving-pill">
          💸 {fmtFull(scenario.rrspTaxSaving)} tax saved this year
        </div>
      )}

      <table className="allocation-table">
        <tbody>
          {scenario.monthly.rrsp > 0 && (
            <tr>
              <td>🏦 RRSP / month</td>
              <td>{fmtFull(scenario.monthly.rrsp)}</td>
            </tr>
          )}
          {scenario.monthly.tfsa > 0 && (
            <tr>
              <td>💰 TFSA / month</td>
              <td>{fmtFull(scenario.monthly.tfsa)}</td>
            </tr>
          )}
          {scenario.monthly.fhsa > 0 && (
            <tr>
              <td>🏠 FHSA / month</td>
              <td>{fmtFull(scenario.monthly.fhsa)}</td>
            </tr>
          )}
          {scenario.monthly.nonRegistered > 0 && (
            <tr>
              <td>📈 Regular account / month</td>
              <td>{fmtFull(scenario.monthly.nonRegistered)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {scenario.narration && <div className="narration-text">{scenario.narration}</div>}

      {(scenario.pros?.length || scenario.cons?.length) && (
        <div className="pros-cons">
          <ul className="pros-cons-list">
            {scenario.pros?.map((pro, i) => (
              <li key={`pro-${i}`}>
                <span className="pro-icon">✓</span>
                <span>{pro}</span>
              </li>
            ))}
            {scenario.cons?.map((con, i) => (
              <li key={`con-${i}`}>
                <span className="con-icon">✗</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
