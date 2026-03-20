import type { YearBand } from '../types';
import { fmtK } from '../utils/format';

/**
 * A pure-CSS bar chart showing year-by-year projected growth.
 * Each bar shows the range (worst to best case) with the most likely outcome marked.
 * No charting library needed.
 */
export default function GrowthChart({
  byYear,
  title,
}: {
  byYear: YearBand[];
  title: string;
}) {
  if (!byYear || byYear.length === 0) return null;

  const maxVal = Math.max(...byYear.map((y) => y.p90)) * 1.05;
  const milestones = findMilestones(byYear);

  return (
    <div className="growth-chart">
      <div className="growth-chart-header">
        <span className="growth-chart-title">{title}</span>
        <div className="growth-chart-legend">
          <span className="legend-item">
            <span className="legend-dot legend-dot-range" />
            Possible range
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot-likely" />
            Most likely
          </span>
        </div>
      </div>

      <div className="growth-chart-body">
        {byYear.map((band, i) => {
          const lowPct = (band.p10 / maxVal) * 100;
          const highPct = (band.p90 / maxVal) * 100;
          const midPct = (band.p50 / maxVal) * 100;
          const milestone = milestones.find((m) => m.year === band.year);

          return (
            <div key={i} className="chart-bar-row">
              <div className="chart-bar-label">Yr {band.year}</div>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-range"
                  style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
                />
                <div className="chart-bar-mid" style={{ left: `${midPct}%` }} />
                {milestone && (
                  <div className="chart-milestone" style={{ left: `${midPct}%` }}>
                    {milestone.label}
                  </div>
                )}
              </div>
              <div className="chart-bar-value">{fmtK(band.p50)}</div>
            </div>
          );
        })}
      </div>

      <div className="growth-chart-footer">
        {milestones.length > 0 && (
          <div className="milestone-summary">
            {milestones.map((m, i) => (
              <span key={i} className="milestone-pill">
                🎯 {m.label} by year {m.year}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface Milestone {
  year: number;
  amount: number;
  label: string;
}

function findMilestones(byYear: YearBand[]): Milestone[] {
  const thresholds = [50_000, 100_000, 250_000, 500_000, 1_000_000];
  const results: Milestone[] = [];
  const labels: Record<number, string> = {
    50_000: '$50K',
    100_000: '$100K',
    250_000: '$250K',
    500_000: '$500K',
    1_000_000: '$1M',
  };

  for (const t of thresholds) {
    const hit = byYear.find((b) => b.p50 >= t);
    if (hit) {
      results.push({ year: hit.year, amount: t, label: labels[t] });
    }
  }
  return results;
}
