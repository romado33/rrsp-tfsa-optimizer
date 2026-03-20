import type { FinancialProfile } from '../types';
import { PROVINCES, RISK_OPTIONS, GOAL_OPTIONS } from '../utils/constants';
import Glossary from './Glossary';

export default function ProfileForm({
  profile,
  error,
  onUpdate,
  onSubmit,
}: {
  profile: FinancialProfile;
  error: string | null;
  onUpdate: <K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {/* Hero Section */}
      <div className="hero">
        <h2 className="hero-title">
          Find the best way to split your savings across RRSP, TFSA, FHSA, and more
        </h2>
        <p className="hero-subtitle">
          Most tools only show you one account at a time. We compare 4 strategies side by side,
          simulate thousands of possible futures, and explain everything in plain English.
        </p>

        <div className="value-props">
          <div className="value-prop">
            <span className="value-prop-icon">📊</span>
            <div>
              <div className="value-prop-title">4 strategies compared</div>
              <div className="value-prop-desc">See all your options side by side — not one calculator at a time</div>
            </div>
          </div>
          <div className="value-prop">
            <span className="value-prop-icon">🎲</span>
            <div>
              <div className="value-prop-title">1,000 simulations each</div>
              <div className="value-prop-desc">See the range of outcomes, not just one misleading &ldquo;average&rdquo;</div>
            </div>
          </div>
          <div className="value-prop">
            <span className="value-prop-icon">💬</span>
            <div>
              <div className="value-prop-title">AI explains in plain English</div>
              <div className="value-prop-desc">No jargon — just clear explanations with your actual dollar amounts</div>
            </div>
          </div>
          <div className="value-prop">
            <span className="value-prop-icon">🧠</span>
            <div>
              <div className="value-prop-title">Honest about what it doesn&apos;t know</div>
              <div className="value-prop-desc">Separates what AI calculated from what only you can decide</div>
            </div>
          </div>
        </div>

        <div className="how-it-works">
          <div className="how-step">
            <div className="how-step-num">1</div>
            <div className="how-step-text">Enter your financial info below</div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-step">
            <div className="how-step-num">2</div>
            <div className="how-step-text">We run 4,000 simulations on your numbers</div>
          </div>
          <div className="how-arrow">→</div>
          <div className="how-step">
            <div className="how-step-num">3</div>
            <div className="how-step-text">AI explains your results with a recommendation</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <div>
            <strong>Analysis failed: </strong>
            {error}
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
              Make sure the backend is running on port 4000 and your OPENAI_API_KEY is set in backend/.env
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Tell Us About You</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Fill in your current situation. The closer these numbers are to reality, the more useful
          your results will be.
        </p>
      </div>

      <div className="profile-form">
        {/* Section 1: Personal */}
        <div className="form-section">
          <div className="form-section-title">About You</div>
          <div className="form-grid three-col">
            <div className="form-field">
              <label>Age</label>
              <input
                type="number"
                min={18}
                max={80}
                value={profile.age}
                onChange={(e) => onUpdate('age', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Province</label>
              <select
                value={profile.province}
                onChange={(e) => onUpdate('province', e.target.value)}
              >
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Annual Income (before tax)</label>
              <input
                type="number"
                min={0}
                value={profile.annualIncome}
                onChange={(e) => onUpdate('annualIncome', +e.target.value)}
              />
            </div>
          </div>
          <div className="toggle-row" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              id="ftb"
              checked={profile.isFirstTimeBuyer}
              onChange={(e) => onUpdate('isFirstTimeBuyer', e.target.checked)}
            />
            <label htmlFor="ftb">I am a first-time home buyer (eligible for FHSA)</label>
          </div>
        </div>

        {/* Section 2: Current Accounts */}
        <div className="form-section">
          <div className="form-section-title">Your Current Accounts</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Check your Wealthsimple, bank, or investment apps for these numbers. You can find your
            RRSP and TFSA room by logging into CRA My Account (canada.ca). Enter 0 for any accounts
            you don&apos;t have.
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>RRSP Balance</label>
              <span className="field-hint">How much is in your RRSP right now</span>
              <input
                type="number"
                min={0}
                value={profile.rrspBalance}
                onChange={(e) => onUpdate('rrspBalance', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Unused RRSP Room</label>
              <span className="field-hint">How much more you can still put in (check CRA My Account)</span>
              <input
                type="number"
                min={0}
                value={profile.rrspRoom}
                onChange={(e) => onUpdate('rrspRoom', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>TFSA Balance</label>
              <span className="field-hint">How much is in your TFSA right now</span>
              <input
                type="number"
                min={0}
                value={profile.tfsaBalance}
                onChange={(e) => onUpdate('tfsaBalance', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Unused TFSA Room</label>
              <span className="field-hint">How much more you can still put in (check CRA My Account)</span>
              <input
                type="number"
                min={0}
                value={profile.tfsaRoom}
                onChange={(e) => onUpdate('tfsaRoom', +e.target.value)}
              />
            </div>
            {profile.isFirstTimeBuyer && (
              <div className="form-field">
                <label>FHSA Balance</label>
                <span className="field-hint">0 if not yet opened</span>
                <input
                  type="number"
                  min={0}
                  value={profile.fhsaBalance}
                  onChange={(e) => onUpdate('fhsaBalance', +e.target.value)}
                />
              </div>
            )}
            <div className="form-field">
              <label>Other Investments</label>
              <span className="field-hint">
                Stocks, funds, or savings that aren&apos;t in an RRSP, TFSA, or FHSA
              </span>
              <input
                type="number"
                min={0}
                value={profile.nonRegisteredBalance}
                onChange={(e) => onUpdate('nonRegisteredBalance', +e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Goals & Risk */}
        <div className="form-section">
          <div className="form-section-title">Your Goal</div>
          <div className="form-grid">
            <div className="form-field">
              <label>Monthly Savings Available</label>
              <span className="field-hint">How much you can consistently save per month</span>
              <input
                type="number"
                min={0}
                value={profile.monthlySavings}
                onChange={(e) => onUpdate('monthlySavings', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Time Horizon (years)</label>
              <span className="field-hint">Years until you need the money</span>
              <input
                type="number"
                min={1}
                max={50}
                value={profile.timeHorizon}
                onChange={(e) => onUpdate('timeHorizon', +e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Primary Goal</label>
              <select
                value={profile.primaryGoal}
                onChange={(e) =>
                  onUpdate('primaryGoal', e.target.value as FinancialProfile['primaryGoal'])
                }
              >
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.icon} {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>How much risk are you comfortable with?</label>
              <select
                value={profile.riskTolerance}
                onChange={(e) =>
                  onUpdate('riskTolerance', e.target.value as FinancialProfile['riskTolerance'])
                }
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {RISK_OPTIONS.find((r) => r.value === profile.riskTolerance)?.description}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={onSubmit}
            disabled={profile.monthlySavings <= 0 || profile.annualIncome <= 0}
          >
            Analyze My Finances →
          </button>
        </div>

        <Glossary />
      </div>
    </>
  );
}
