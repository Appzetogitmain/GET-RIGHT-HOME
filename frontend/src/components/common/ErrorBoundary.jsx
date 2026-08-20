import React from 'react';

// Catches uncaught render/DOM errors anywhere below it so the app shows a
// recoverable "Something went wrong" screen instead of going fully blank.
// Without this, an uncaught exception (e.g. a component crashing mid-render)
// unmounts the whole React tree and leaves the user staring at a white page
// with no way forward except guessing to reload.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
          <div className="flex flex-col items-center gap-4 p-6 max-w-md mx-auto text-center">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800">Something went wrong</h2>
            <p className="text-gray-600">
              The app hit an unexpected error. Your progress on this page may be lost, but anything saved earlier is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-[#0073E6] hover:bg-[#005fc2] transition-colors shadow-md"
            >
              Refresh Page
            </button>
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-red-50 rounded-lg max-w-full overflow-auto text-left">
                <summary className="cursor-pointer font-semibold text-red-800 mb-2">Error Details (Dev Only)</summary>
                <pre className="text-xs text-red-700 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
