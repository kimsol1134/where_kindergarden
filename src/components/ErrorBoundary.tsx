'use client';

import { Component, type ReactNode } from 'react';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              문제가 발생했습니다
            </h2>
            <p className="text-gray-500 mb-4 text-center">
              일시적인 오류가 발생했습니다.<br />
              잠시 후 다시 시도해주세요.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
