import { useState, useEffect, useRef } from 'react';
import type { FinancialProfile, AnalysisResult, AppView } from './types';
import { BACKEND_URL, DEFAULT_PROFILE } from './utils/constants';
import Header from './components/Header';
import ProfileForm from './components/ProfileForm';
import AnalyzingView from './components/AnalyzingView';
import ResultsView from './components/ResultsView';

export default function App() {
  const [view, setView] = useState<AppView>('profile');
  const [profile, setProfile] = useState<FinancialProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function updateProfile<K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze() {
    setError(null);
    setStepIndex(0);
    setView('analyzing');

    progressIntervalRef.current = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, 5));
    }, 3000);

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Server error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setSelectedScenarioId(data.decisionGate?.recommendedScenarioId ?? null);
      setResult(data);
      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setView('profile');
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  if (view === 'profile') {
    return (
      <div className="app">
        <Header />
        <div className="main-content">
          <ProfileForm
            profile={profile}
            error={error}
            onUpdate={updateProfile}
            onSubmit={handleAnalyze}
          />
        </div>
      </div>
    );
  }

  if (view === 'analyzing') {
    return (
      <div className="app">
        <Header />
        <div className="main-content">
          <AnalyzingView stepIndex={stepIndex} />
        </div>
      </div>
    );
  }

  if (view === 'results' && result) {
    return (
      <div className="app">
        <Header />
        <div className="main-content">
          <ResultsView
            profile={profile}
            result={result}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            onEditProfile={() => setView('profile')}
          />
        </div>
      </div>
    );
  }

  return null;
}
