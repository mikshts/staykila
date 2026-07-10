import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("BillingPage Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f7f3ee]">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We couldn't load your billing information. Please try again later.
            </p>
            <details className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <summary>Technical details</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#0f1b2d] text-white px-4 py-2 rounded-lg">
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
