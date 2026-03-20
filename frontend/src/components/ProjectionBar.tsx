import { fmtK } from '../utils/format';

/**
 * CSS-only range visualization showing the P10-P90 outcome range.
 * The filled portion represents the likely outcome band.
 */
export default function ProjectionBar({
  p10,
  p50,
  p90,
  maxVal,
}: {
  p10: number;
  p50: number;
  p90: number;
  maxVal: number;
}) {
  const leftPct = Math.max(0, Math.min(100, (p10 / maxVal) * 100));
  const rightPct = Math.max(0, Math.min(100, (p90 / maxVal) * 100));
  const width = Math.max(2, rightPct - leftPct);

  return (
    <div>
      <div className="projection-headline">{fmtK(p50)}</div>
      <div className="projection-label">
        most likely outcome · {fmtK(p10)} – {fmtK(p90)} range
      </div>
      <div className="range-bar-container">
        <div className="range-bar-track">
          <div className="range-bar-fill" style={{ left: `${leftPct}%`, width: `${width}%` }} />
        </div>
        <div className="range-bar-labels">
          <span>$0</span>
          <span>{fmtK(maxVal)}</span>
        </div>
      </div>
    </div>
  );
}
