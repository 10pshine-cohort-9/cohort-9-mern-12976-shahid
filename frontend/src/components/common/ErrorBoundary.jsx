import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError (){
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
   
    console.error(
      "Suspense/Lazy loading error caught by ErrorBoundary:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center dark:bg-gray-950">
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-200">
            Something went wrong.
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            We had trouble loading this page. Please refresh to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
