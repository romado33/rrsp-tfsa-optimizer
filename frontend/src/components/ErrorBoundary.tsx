import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app">
          <header className="app-header">
            <div className="logo-mark">WS</div>
            <h1>Financial Decision Engine</h1>
          </header>
          <div className="main-content">
            <div className="error-banner">
              <span>⚠️</span>
              <div>
                <strong>Something went wrong.</strong>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {this.state.error?.message || 'An unexpected error occurred.'}
                </div>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => this.setState({ hasError: false, error: null })}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
