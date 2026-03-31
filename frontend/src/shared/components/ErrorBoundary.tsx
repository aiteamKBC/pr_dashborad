import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown render error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-8 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-red-900 shadow-sm">
          <h2 className="text-lg font-bold">
            {this.props.fallbackTitle || 'Something went wrong while rendering the page'}
          </h2>
          <p className="mt-2 text-sm text-red-800">
            {this.props.fallbackMessage || 'A runtime error stopped the page from displaying correctly.'}
          </p>
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-red-700">
            {this.state.errorMessage}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
