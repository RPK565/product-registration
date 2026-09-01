import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>Your data is safe in this phone&apos;s storage.</p>
          <p className="error-boundary-detail">{this.state.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            RELOAD APP
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}