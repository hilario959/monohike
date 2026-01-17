import { Component, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: ''
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || 'Unexpected error'
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="app-title">Monohike</p>
          </div>
        </header>
        <main className="app-content">
          <div className="card">
            <p className="section-title">We hit a snag</p>
            <p className="muted">
              The app failed to start. Refresh the page, and if it keeps happening, clear the site
              data or try a different browser.
            </p>
            <p className="muted">Error: {this.state.message}</p>
          </div>
        </main>
      </div>
    );
  }
}

export default AppErrorBoundary;
