import type { Scenario } from '../types';
import { fmtK, fmtFull } from '../utils/format';

/**
 * Side-by-side comparison of all strategies at a glance.
 * Wealthsimple's calculators only show one account at a time —
 * this lets you compare everything in one table.
 */
export default function ComparisonTable({
  scenarios,
  recommendedId,
}: {
  scenarios: Scenario[];
  recommendedId?: string;
}) {
  if (!scenarios || scenarios.length === 0) return null;

  const best = {
    p50: Math.max(...scenarios.map((s) => s.projections.p50)),
    taxSaving: Math.max(...scenarios.map((s) => s.rrspTaxSaving)),
  };

  return (
    <div className="comparison-table-wrapper">
      <h3>Strategy Comparison at a Glance</h3>
      <p className="comparison-subtitle">
        See how all four strategies stack up — something no other tool shows you in one view.
      </p>
      <div className="comparison-table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Strategy</th>
              {scenarios.map((s) => (
                <th key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  <span className="comparison-icon">{s.icon}</span> {s.name}
                  {s.id === recommendedId && <div className="rec-tag">AI Pick</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="row-label">Most likely outcome</td>
              {scenarios.map((s) => (
                <td
                  key={s.id}
                  className={`${s.id === recommendedId ? 'recommended-col' : ''} ${s.projections.p50 === best.p50 ? 'best-value' : ''}`}
                >
                  {fmtK(s.projections.p50)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Worst case (bottom 10%)</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {fmtK(s.projections.p10)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Best case (top 10%)</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {fmtK(s.projections.p90)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Tax refund this year</td>
              {scenarios.map((s) => (
                <td
                  key={s.id}
                  className={`${s.id === recommendedId ? 'recommended-col' : ''} ${s.rrspTaxSaving === best.taxSaving && s.rrspTaxSaving > 0 ? 'best-value' : ''}`}
                >
                  {s.rrspTaxSaving > 0 ? fmtFull(s.rrspTaxSaving) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Monthly to RRSP</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {s.monthly.rrsp > 0 ? fmtFull(s.monthly.rrsp) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Monthly to TFSA</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {s.monthly.tfsa > 0 ? fmtFull(s.monthly.tfsa) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">Monthly to FHSA</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {s.monthly.fhsa > 0 ? fmtFull(s.monthly.fhsa) : '—'}
                </td>
              ))}
            </tr>
            {scenarios.some((s) => s.monthly.rdsp > 0) && (
              <tr>
                <td className="row-label">Monthly to RDSP</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                    {s.monthly.rdsp > 0 ? fmtFull(s.monthly.rdsp) : '—'}
                  </td>
                ))}
              </tr>
            )}
            <tr>
              <td className="row-label">Monthly to regular account</td>
              {scenarios.map((s) => (
                <td key={s.id} className={s.id === recommendedId ? 'recommended-col' : ''}>
                  {s.monthly.nonRegistered > 0 ? fmtFull(s.monthly.nonRegistered) : '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
