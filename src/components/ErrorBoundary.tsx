'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI. If not provided, a default error message is shown. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component.
 * Catches rendering errors in child components and displays a fallback UI
 * instead of crashing the entire application.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="text-red-400 text-lg font-medium mb-2">组件渲染出错</div>
          <div className="text-zinc-500 text-sm mb-4 max-w-md">
            {this.state.error?.message || '未知错误'}
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
