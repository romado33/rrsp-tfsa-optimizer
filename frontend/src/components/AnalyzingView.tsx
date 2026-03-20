import { PROGRESS_STEPS } from '../utils/constants';

export default function AnalyzingView({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="analyzing-view">
      <div className="spinner-ring" />
      <div>
        <div className="analyzing-title">Running your analysis</div>
        <div className="analyzing-progress">{PROGRESS_STEPS[stepIndex]?.label}</div>
      </div>
      <div className="analyzing-steps">
        {PROGRESS_STEPS.map((step, i) => (
          <div
            key={i}
            className={`step-item ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
          >
            <div className="step-dot" />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
