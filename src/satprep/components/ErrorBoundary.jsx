import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="sat-panel" style={{ textAlign: 'center', marginTop: 40 }}>
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Your progress has been auto-saved.</p>
          <p className="sat-muted" style={{ fontSize: 13 }}>
            {String(this.state.error?.message || '')}
          </p>
          <button
            type="button"
            className="sat-btn sat-btn--primary"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 12 }}
          >
            Try Again
          </button>
          <button
            type="button"
            className="sat-btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, marginLeft: 8 }}
          >
            Reload App
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
